import re
import base64
import datetime
import functools
import json
import uuid

from urllib.parse import urlparse
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.models.fields.files import FieldFile
from django.db.models import F, Count, Q
from django.db import transaction
from django.utils.timezone import now

from channels.auth import channel_session_user, channel_session_user_from_http
from channels_presence.models import Room, Presence
from channels_presence.decorators import touch_presence, remove_presence

from plenaries.models import Plenary, ChatMessage
from breakouts.models import Breakout
from videosync.models import VideoSync
from reunhangout.channels_utils import (
    broadcast, handle_error, require_payload_keys, prepare_message,
    send_to_channel
)
from reunhangout.utils import json_dumps
from analytics.models import track
from django.contrib.auth import get_user_model
from accounts.utils import serialize_auth_state
from plenaries.utils import find_atnames

User = get_user_model()

@channel_session_user_from_http
def ws_connect(message, slug):
    try:
        plenary = Plenary.objects.get(slug=slug)
    except Plenary.DoesNotExist:
        return handle_error(message,  'Plenary not found')

    # Handle max connections
    if plenary.max_participants > 0 and not plenary.has_admin(message.user):
        num_present = Presence.objects.filter(
            room__channel_name=plenary.channel_group_name
        ).count()
        if num_present > plenary.max_participants:
            return message.reply_channel.send({"accept": False})

    if plenary.open and not message.user.is_authenticated:
        return handle_error(message, "Authentication required to connect to open plenaries")

    message.reply_channel.send({"accept": True})
    Room.objects.add(plenary.channel_group_name, message.reply_channel.name, message.user)
    track("join_plenary", message.user, plenary=plenary)

@remove_presence
@channel_session_user
def ws_disconnect(message, slug=None):
    if slug:
        try:
            plenary = Plenary.objects.get(slug=slug)
        except Plenary.DoesNotExist:
            plenary = None
        track("leave_plenary", message.user, plenary=plenary)

        # Remove live participant record if any, so that participants who close
        # their tab or refresh have to explicitly reconnect. Issue #44.
        if plenary:
            if plenary.live_participants.filter(id=message.user.id).exists():
                payload = {'payload': {'username': message.user.username}}
                handle_remove_live_participant(message, payload, plenary)

@touch_presence
@channel_session_user
def ws_receive(message, slug):
    if not message.user.is_authenticated:
        return handle_error(message, "Authentication required")
    try:
        data = json.loads(message.content['text'])
    except ValueError:
        return handle_error(message, "Message body must be json")
    try:
        plenary = Plenary.objects.get(slug=slug)
    except Plenary.DoesNotExist:
        return handle_error(message, "Plenary not found")
    route_message(message, data, plenary)

def route_message(message, data, plenary):
    if 'type' not in data:
        handle_error(message, "Missing type")
    elif data['type'] == "chat":
        handle_chat(message, data, plenary)
    elif data['type'] == "archive_chat":
        handle_archive_chat(message, data, plenary)
    elif data['type'] == "embeds":
        handle_embeds(message, data, plenary)
    elif data['type'] == "breakout":
        handle_breakout(message, data, plenary)
    elif data['type'] == "plenary":
        handle_plenary(message, data, plenary)
    elif data['type'] == "contact_card":
        handle_contact_card(message, data, plenary)
    elif data['type'] == 'videosync':
        handle_video_sync(message, data, plenary)
    elif data['type'] == "message_breakouts":
        handle_message_breakouts(message, data, plenary)
    elif data['type'] == "add_live_participant":
        handle_add_live_participant(message, data, plenary)
    elif data['type'] == "remove_live_participant":
        handle_remove_live_participant(message, data, plenary)
    elif data['type'] == "request_speaker_stats":
        handle_request_speaker_stats(message, data, plenary)
    elif data['type'] == "enable_speaker_stats":
        handle_enable_speaker_stats(message, data, plenary)
    else:
        handle_error(message, "Type not understood")


@require_payload_keys(['message'])
def handle_chat(message, data, plenary):
    highlight = (
        data['payload'].get('highlight') and \
        (message.user.is_superuser or plenary.has_admin(message.user))
    )
    with transaction.atomic():
        chat_message = ChatMessage.objects.create(
            plenary=plenary,
            user=message.user,
            message=data['payload']['message'],
            highlight=highlight or False
        )
        # He comes. https://stackoverflow.com/a/1732454
        user_ids = re.findall(
            r'''<span [^>]*(?<= )data-mention-user-id=['"](\d+)['"][^>]*>''', 
            data['payload']['message']
        )
        mentions = plenary.associated_users().filter(id__in=user_ids)
        chat_message.mentions.set(mentions)

        data = chat_message.serialize()
        broadcast(plenary.channel_group_name, type='chat', payload=data)
        track("plenary_chat", message.user, data, plenary=plenary)

@require_payload_keys(['message_ids'])
def handle_archive_chat(message, data, plenary):
    if not plenary.has_admin(message.user):
        return handle_error(message, "Must be an admin to archive chat messages")

    message_ids = data['payload'].get('message_ids')
    chat_messages = ChatMessage.objects.filter(id__in=message_ids, plenary=plenary)
    chat_messages.update(archived=True)
    broadcast(plenary.channel_group_name, type='chat_replace',
            payload=[m.serialize() for m in chat_messages])

@require_payload_keys(['embeds'])
def handle_embeds(message, data, plenary):
    if not plenary.has_admin(message.user):
        return handle_error(message, "Must be an admin to set embeds")

    error = None
    clean = []
    for embed in data.get('payload', {}).get('embeds', []):
        if not isinstance(embed, dict):
            error = "Malformed embed"
        elif embed['type'] == 'live':
            clean.append({'type': 'live'})
            continue
        elif not isinstance(embed.get('props'), dict):
            error = "Malformed embed: missing props"
        elif embed.get('type') not in ("youtube", "url"):
            error = "Invalid type: {}".format(embed['type'])
        else:
            parsed = urlparse(embed['props']['src'])
            if parsed.scheme != "https":
                error = "Only https URLs allowed"
        if error:
            return handle_error(message, error)
        else:
            clean.append({
                'props': {'src': embed['props']['src']},
                'type': embed['type']
            })
    current = data['payload'].get('current', None)
    if current is not None and not isinstance(current, int):
        return handle_error(message, "Invalid 'current' type")
    if isinstance(current, int) and (current < 0  or current > len(clean)):
        return handle_error(message, "Invalid 'current' value")

    # Stop any current video sync if we're changing the current embed.
    if plenary.embeds and plenary.embeds['current'] != current:
        VideoSync.objects.pause_for_all(plenary.channel_group_name)

    plenary.embeds = {
        'embeds': clean,
        'current': current
    }
    plenary.full_clean()
    plenary.save()
    broadcast(plenary.channel_group_name, type='embeds', payload=plenary.embeds)
    track("change_embeds", message.user, plenary.embeds, plenary=plenary)

@require_payload_keys(['action'])
def handle_breakout(message, data, plenary):
    is_admin = plenary.has_admin(message.user)
    admin_required_error = lambda: handle_error(message, "Must be an admin to do that.")

    payload = data['payload']
    action = payload['action']

    if not is_admin and not (
            plenary.breakout_mode == "user" or
            (plenary.breakout_mode == "random" and action == "group_me")):
        return admin_required_error()

    def respond_with_breakouts():
        # Not-too-efficient strategy: always respond with the full list of
        # breakouts from a new database query.  We can optimize this later if
        # needed.
        broadcast(plenary.channel_group_name, type='breakout_receive',
            payload=[b.serialize() for b in plenary.breakout_set.active()])

    # Handle actions

    if action == 'create':
        if not is_admin and plenary.breakout_mode != "user":
            return admin_required_error()
        if 'title' not in payload:
            return handle_error(message, "Missing 'title'")
        if is_admin:
            etherpad_initial_text = payload.get('etherpad_initial_text', '')
        else:
            etherpad_initial_text = None
        breakout = Breakout(
            plenary=plenary,
            title=payload['title'],
            etherpad_initial_text=etherpad_initial_text,
            max_attendees=payload.get('max_attendees') or 10,
            is_proposal=(not is_admin or payload.get('is_proposal', False)),
            proposed_by=message.user
        )
        breakout.full_clean()
        breakout.save()
        if breakout.is_proposal:
            track("propose_breakout", message.user, breakout=breakout)
        return respond_with_breakouts()

    elif action == 'group_me':
        if plenary.breakout_mode != "random":
            return handle_error(message, "Must be in random mode to do that.")
        blacklist = set()
        # Remove membership, if any, from current breakouts
        for breakout in plenary.breakout_set.filter(members=message.user):
            breakout.members.remove(message.user)
            # Add to blacklist so we don't just rejoin this group.
            blacklist.add(breakout.id)

        # Place in an existing breakout, if available
        available_random_breakouts = plenary.breakout_set.active().exclude(
            id__in=blacklist
        ).annotate(
            member_count=Count('members')
        ).filter(
            is_random=True,
            member_count__lt=F('max_attendees')
        )
        try:
            breakout = available_random_breakouts[0]
        except IndexError:
            breakout = Breakout.objects.create(
                    plenary=plenary,
                    title='Breakout',
                    max_attendees=plenary.random_max_attendees,
                    is_random=True)
        breakout.members.add(message.user)
        return respond_with_breakouts()

    # For all actions other than create, we expect payload['id'] to contain the
    # id of the breakout to operate on.

    try:
        breakout = plenary.breakout_set.active().get(id=payload['id'])
    except (Breakout.DoesNotExist, KeyError):
        return handle_error(message, "Breakout not found.")

    if action == 'delete':
        if not is_admin:
            return admin_required_error()
        breakout.active = False
        breakout.save()
        return respond_with_breakouts()

    elif action == 'modify':
        can_modify = (
            is_admin or
            (plenary.breakout_mode == "user" and breakout.proposed_by == message.user)
        )
        if not can_modify:
            if plenary.breakout_mode == "user":
                return handle_error(message, "Must be breakout proposer or admin to do that")
            return admin_required_error()
        if 'title' in payload:
            breakout.title = payload['title']
        breakout.save()
        return respond_with_breakouts()

    elif action == 'approve':
        if not is_admin:
            return admin_required_error()

        breakout.is_proposal = not breakout.is_proposal
        breakout.save()
        return respond_with_breakouts()

    elif action == 'vote':
        if plenary.breakout_mode != "user":
            return handle_error(message, "Can only vote on user-proposed breakouts")
        # Toggle vote
        if breakout.votes.filter(pk=message.user.pk).exists():
            breakout.votes.remove(message.user)
        else:
            breakout.votes.add(message.user)
        track("change_breakout_vote", message.user, breakout=breakout)
        return respond_with_breakouts()

_image_type_ext_map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
}

def _b64_image_to_uploaded_file(b64data):
    content_type, image_b64 = b64data.split(";base64,")
    content_type = content_type.replace("data:", "")
    if content_type not in _image_type_ext_map:
        raise ValidationError("Invalid image type")
    image_bytes = base64.b64decode(image_b64)
    filename = "".join((str(uuid.uuid4()), _image_type_ext_map[content_type]))
    return SimpleUploadedFile(filename, image_bytes, content_type)

PLENARY_SIMPLE_UPDATE_KEYS = (
    'random_max_attendees', 'breakout_mode', 'name', 'organizer', 'start_date',
    'end_date', 'doors_open', 'doors_close', 'breakouts_open', 'canceled',
    'slug', 'public', 'jitsi_server', 'wrapup_emails', 'etherpad_initial_text'
)
PLENARY_SANITIZED_KEYS = (
    'whiteboard', 'description'
)


def update_plenary(plenary, payload):
    for key in PLENARY_SIMPLE_UPDATE_KEYS + PLENARY_SANITIZED_KEYS:
        if key in payload:
            setattr(plenary, key, payload[key])

    # Images - read in base64 type
    if isinstance(payload.get('image'), FieldFile):
        plenary.image = payload['image']
    elif isinstance(payload.get('image'), str) and payload['image'].startswith("data:image/"):
        try:
            plenary.image = _b64_image_to_uploaded_file(payload['image'])
        except (ValidationError, ValueError, TypeError) as e:
            raise ValidationError("Invalid image")
    elif payload.get('image', False) is None:
        plenary.image = None

    # Handle date arithmetic for boolean "open" nudging.
    change_open = payload.get('open')
    if change_open is not None:
        right_now = now()
        is_open = plenary.open
        if change_open == True:
            # Un-cancel if we're changing to open.
            if plenary.canceled:
                plenary.canceled = False
            if right_now < plenary.doors_open:
                # Doors haven't opened. Open them.
                plenary.doors_open = right_now 
            elif plenary.doors_open < right_now < plenary.doors_close:
                # Already open. Do nothing.
                pass
            elif plenary.doors_close <= right_now:
                # Doors already closed. Reopen them.
                plenary.doors_close = right_now + datetime.timedelta(hours=1)
        elif change_open == False:
            if right_now < plenary.doors_open:
                # Doors haven't opened. Do nothing.
                pass
            elif plenary.doors_open < right_now < plenary.doors_close:
                # Already open. Close now.
                plenary.doors_close = plenary.end_date = right_now
            elif plenary.doors_close <= right_now:
                # Doors already closed. Do nothing.
                pass
    plenary.full_clean()


def update_plenary_admins(plenary, payload):
    # Handle admins
    if payload.get('admins'):
        admins = payload['admins']
        users = list(User.objects.filter(id__in=[a['id'] for a in admins]))
        if len(users) > 0:
            plenary.admins.set(users)


@require_payload_keys([])
def handle_plenary(message, data, plenary):
    if not plenary.has_admin(message.user):
        return handle_error(message, "Must be an admin to do that.")

    old_jitsi_server = plenary.jitsi_server
    old_admins = list(plenary.admins.all())
    payload = data['payload']
    try:
        update_plenary(plenary, payload)
        update_plenary_admins(plenary, payload)
    except ValidationError as e:
        handle_error(message, json_dumps(e.message_dict))

    breakouts_changed = False
    if plenary.jitsi_server != old_jitsi_server:
        breakouts_changed = True
    try:
        with transaction.atomic():
            plenary.save()
            if 'random_max_attendees' in payload:
                # Not using queryset.update here, because we want to be able to
                # rely on signals for eventual use of django-channels data
                # binding:
                # http://channels.readthedocs.io/en/latest/binding.html
                for breakout in plenary.breakout_set.active().filter(
                        is_random=True):
                    if breakout.max_attendees != plenary.random_max_attendees:
                        breakout.max_attendees = plenary.random_max_attendees
                        breakout.full_clean()
                        breakout.save()
                        breakouts_changed = True
    except ValidationError as e:
        return handle_error(message, json_dumps(e.message_dict))

    update = {key: getattr(plenary, key) for key in PLENARY_SIMPLE_UPDATE_KEYS}
    update.update({key: getattr(plenary, "safe_" + key)() for key in PLENARY_SANITIZED_KEYS})
    admins = list(plenary.admins.all())
    update['admins'] = [u.serialize_public() for u in admins]
    update['open'] = plenary.open
    update['image'] = plenary.image.url if plenary.image else None
    broadcast(plenary.channel_group_name, type='plenary', payload={'plenary': update})

    admin_change = {u.id: u for u in set(old_admins) ^ set(admins)}
    for presence in Presence.objects.filter(
            room__channel_name=plenary.channel_group_name,
            user__id__in=admin_change.keys()):
        send_to_channel(
            presence.channel_name,
            type='auth',
            payload=serialize_auth_state(
                admin_change[presence.user_id], plenary
            )
        )

    if breakouts_changed:
        breakouts_serialized = [
            (b, b.serialize()) for b in plenary.breakout_set.active()
        ]

        # Broadcast new breakouts to plenary
        broadcast(plenary.channel_group_name, type='breakout_receive',
            payload=[b[1] for b in breakouts_serialized])

        # Broadcast new breakouts to breakouts
        for breakout, serialized in breakouts_serialized:
            broadcast(breakout.channel_group_name, type='breakout', payload=serialized)


@require_payload_keys(['id'])
def handle_add_live_participant(message, data, plenary):
    if not plenary.has_admin(message.user):
        return handle_error(message, "Must be an admin to do add live participants.")

    try:
        user = User.objects.get(id=data['payload']['id'])
    except User.DoesNotExist:
        return handle_error(message, "User not found.")

    plenary.live_participants.add(user)
    payload = {
        'live_participants': list(
            plenary.live_participants.values_list('id', flat=True)
        )
    }
    broadcast(
        plenary.channel_group_name,
        type='live_participants',
        payload=payload
    )
    

@require_payload_keys(['id'])
def handle_remove_live_participant(message, data, plenary):
    authorized = (
        (data['payload']['id'] == message.user.id) or
        plenary.has_admin(message.user)
    )
    if not authorized:
        return handle_error(message, "Must be an admin to remove live participants other than yourself")

    try:
        user = User.objects.get(id=data['payload']['id'])
    except User.DoesNotExist:
        return handle_error(message, "User not found")

    plenary.live_participants.remove(user)
    payload = {
        'live_participants': list(
            plenary.live_participants.values_list('id', flat=True)
        )
    }
    broadcast(
        plenary.channel_group_name,
        type='live_participants',
        payload=payload
    )


@require_payload_keys([])
def handle_contact_card(message, data, plenary):
    payload = data['payload']

    user = message.user
    keys = [
        'receive_wrapup_emails', 'email', 'contact_card_email',
        'contact_card_twitter',
    ]
    for key in keys:
        if key in payload:
            setattr(user, key, payload[key])

    try:
        user.full_clean()
    except ValidationError as e:
        return handle_error(message, json_dumps(e.message_dict))
    user.save()

    track("change_contact_card", message.user, plenary=plenary)

    message.reply_channel.send(prepare_message(
        type="auth",
        payload=serialize_auth_state(user, plenary)
    ))

    for room in Room.objects.filter(
            presence__user__id=user.id).distinct():
        broadcast(
            room.channel_name,
            type="users",
            payload={user.id: user.serialize_public()}
        )


@require_payload_keys(['action'])
def handle_video_sync(message, data, plenary):
    if not plenary.has_admin(message.user):
        return handle_error(message, "Must be an admin to control video sync")

    payload = data['payload']
    # Here, we're ignoring the payload['sync_id'] value and instead just
    # reusing plenary.channel_group_name as the sync_id. This is a convenient
    # way to ensure that the sync_id is the correct one for the plenary, and
    # prevents admins from abusing other rooms.  But we'll need to change this
    # if we ever want more than one video container with sync on a plenary at
    # once.
    if payload['action'] == "play":
        time_index = payload.get('time_index', 0)
        VideoSync.objects.start(
            sync_id=plenary.channel_group_name,
            channel_group_name=plenary.channel_group_name,
            time_index=time_index
        )
        track("start_play_for_all", message.user, plenary=plenary)
    elif payload['action'] == "pause":
        VideoSync.objects.pause_for_all(
            sync_id=plenary.channel_group_name
        )
        track("stop_play_for_all", message.user, plenary=plenary)
    elif payload['action'] == "endSync":
        VideoSync.objects.end_sync(
            sync_id=plenary.channel_group_name
        )

@require_payload_keys(['message'])
def handle_message_breakouts(message, data, plenary):
    if not plenary.has_admin(message.user):
        return handle_error(message, "Must be an admin to message breakouts")

    msg_text = data['payload']['message']
    for breakout in plenary.breakout_set.active():
        broadcast(breakout.channel_group_name, type='message_breakouts',
                payload={'message': msg_text})
    track("message_breakouts", message.user, {'message': msg_text}, plenary=plenary)

@require_payload_keys(['requestSpeakerStats'])
def handle_request_speaker_stats(message, data, plenary):
    if not plenary.has_admin(message.user):
        return handle_error(message, "Must be an admin to request speaker stats")

    for breakout in plenary.breakout_set.active():
        broadcast(breakout.channel_group_name, type='request_speaker_stats',
                payload=data['payload'])

@require_payload_keys(['enableSpeakerStats'])
def handle_enable_speaker_stats(message, data, plenary):
    if not plenary.has_admin(message.user):
        return handle_error(message, "Must be an admin to request speaker stats")

    for breakout in plenary.breakout_set.active():
        breakout.enable_speaker_stats = True
        breakout.save()