from django.core.exceptions import ValidationError
from django.db.models.fields.files import FieldFile
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.models import F, Count, Q
from django.db import transaction
from django.utils.timezone import now

from channels.generic.websocket import WebsocketConsumer

from channels_presence.models import Room, Presence
from channels_presence.decorators import touch_presence, remove_presence

from reunhangout.channels_utils import (
    broadcast, prepare_message,
    send_to_channel
)
from plenaries.models import Plenary, ChatMessage
from breakouts.models import Breakout
from videosync.models import VideoSync
from analytics.models import track
from accounts.utils import serialize_auth_state
from reunhangout.utils import json_dumps

from urllib.parse import urlparse
import re
import json
import base64
import uuid
import datetime

User = get_user_model()

class PlenaryConsumer(WebsocketConsumer):

    def handle_error(self, error):
        data = prepare_message(type='error', error=error)
        track("error", self.scope['user'], data)
        self.send(text_data=data['text'])

    def connect(self):
        self.slug = self.scope['url_route']['kwargs']['slug']
        try:
            plenary = Plenary.objects.get(slug=self.slug)
        except Plenary.DoesNotExist:
            return self.handle_error('Plenary not found')

        # Handle max connections
        if plenary.max_participants > 0 and not plenary.has_admin(self.scope['user']):
            num_present = Presence.objects.filter(
                room__channel_name=plenary.channel_group_name
            ).count()
            if num_present > plenary.max_participants:
                return self.close()

        if plenary.open and not self.scope['user'].is_authenticated:
            return self.handle_error("Authentication required to connect to open plenaries")

        self.accept()
        # This joins the consumer's channel to the group for this plenary
        Room.objects.add(plenary.channel_group_name, self.channel_name, self.scope['user'])
        track("join_plenary", self.scope['user'], plenary=plenary)

    @remove_presence
    def disconnect(self, close_code):
        try:
            plenary = Plenary.objects.get(slug=self.slug)
        except Plenary.DoesNotExist:
            return self.handle_error('Plenary not found')
        track("leave_plenary", self.scope['user'], plenary=plenary)

        # TODO - remove live participant code if only related to live video button
        # Remove live participant record if any, so that participants who close
        # their tab or refresh have to explicitly reconnect. Issue #44.
        #   if plenary:
        #       if plenary.live_participants.filter(id=self.scope['user'].id).exists():
        #           payload = {'payload': {'username': self.scope['user'].username}}
        #           handle_remove_live_participant(message, payload, plenary)

    @touch_presence
    def receive(self, text_data):
        print(text_data)
        try:
            plenary = Plenary.objects.get(slug=self.slug)
        except Plenary.DoesNotExist:
            return self.handle_error('Plenary not found')
        data = json.loads(text_data)
        if 'type' not in data:
            self.handle_error("Missing type")
        elif data['type'] == "chat":
            self.handle_chat(data, plenary)
        elif data['type'] == "archive_chat":
            self.handle_archive_chat(data, plenary)
        elif data['type'] == "embeds":
            self.handle_embeds(data, plenary)
        elif data['type'] == "breakout":
            self.handle_breakout(data, plenary)
        elif data['type'] == "plenary":
            self.handle_plenary(data, plenary)
        elif data['type'] == "contact_card":
            self.handle_contact_card(data, plenary)
        elif data['type'] == 'videosync':
            self.handle_video_sync(data, plenary)
        elif data['type'] == "message_breakouts":
            self.handle_message_breakouts(data, plenary)
        #elif data['type'] == "add_live_participant":
        #    handle_add_live_participant(message, data, plenary)
        #elif data['type'] == "remove_live_participant":
        #    handle_remove_live_participant(message, data, plenary)
        elif data['type'] == "request_speaker_stats":
            self.handle_request_speaker_stats(data, plenary)
        else:
            self.handle_error(f"Type {data['type']} not understood")

    def forward_to_client(self, event):
        print(event)
        self.send(text_data=event['text'])

    def handle_chat(self, data, plenary):
        highlight = (
            data['payload'].get('highlight') and \
            (self.scope['user'].is_superuser or plenary.has_admin(self.scope['user']))
        )
        with transaction.atomic():
            chat_message = ChatMessage.objects.create(
                plenary=plenary,
                user=self.scope['user'],
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
            track("plenary_chat", self.scope['user'], data, plenary=plenary)

    #@require_payload_keys(['message_ids'])
    def handle_archive_chat(self, data, plenary):
        if not plenary.has_admin(self.scope['user']):
            return self.handle_error("Must be an admin to archive chat messages")

        message_ids = data['payload'].get('message_ids')
        chat_messages = ChatMessage.objects.filter(id__in=message_ids, plenary=plenary)
        chat_messages.update(archived=True)
        broadcast(plenary.channel_group_name, type='chat_replace',
                payload=[m.serialize() for m in chat_messages])

    #@require_payload_keys(['action'])
    def handle_breakout(self, data, plenary):
        is_admin = plenary.has_admin(self.scope['user'])
        admin_required_error = lambda: self.handle_error("Must be an admin to do that.")

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
                return self.handle_error("Missing 'title'")
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
                proposed_by=self.scope['user']
            )
            breakout.full_clean()
            breakout.save()
            if breakout.is_proposal:
                track("propose_breakout", self.scope['user'], breakout=breakout)
            return respond_with_breakouts()

        elif action == 'group_me':
            if plenary.breakout_mode != "random":
                return self.handle_error("Must be in random mode to do that.")
            blacklist = set()
            # Remove membership, if any, from current breakouts
            for breakout in plenary.breakout_set.filter(members=self.scope['user']):
                breakout.members.remove(self.scope['user'])
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
            breakout.members.add(self.scope['user'])
            return respond_with_breakouts()

        # For all actions other than create, we expect payload['id'] to contain the
        # id of the breakout to operate on.

        try:
            breakout = plenary.breakout_set.active().get(id=payload['id'])
        except (Breakout.DoesNotExist, KeyError):
            return self.handle_error("Breakout not found.")

        if action == 'delete':
            if not is_admin:
                return admin_required_error()
            breakout.active = False
            breakout.save()
            return respond_with_breakouts()

        elif action == 'modify':
            can_modify = (
                is_admin or
                (plenary.breakout_mode == "user" and breakout.proposed_by == self.scope['user'])
            )
            if not can_modify:
                if plenary.breakout_mode == "user":
                    return self.handle_error("Must be breakout proposer or admin to do that")
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
                return self.handle_error("Can only vote on user-proposed breakouts")
            # Toggle vote
            if breakout.votes.filter(pk=self.scope['user'].pk).exists():
                breakout.votes.remove(self.scope['user'])
            else:
                breakout.votes.add(self.scope['user'])
            track("change_breakout_vote", self.scope['user'], breakout=breakout)
            return respond_with_breakouts()

    #@require_payload_keys(['embeds'])
    def handle_embeds(self, data, plenary):
        if not plenary.has_admin(self.scope['user']):
            return self.handle_error("Must be an admin to set embeds")

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
                return self.handle_error(error)
            else:
                clean.append({
                    'props': {'src': embed['props']['src']},
                    'type': embed['type']
                })
        current = data['payload'].get('current', None)
        if current is not None and not isinstance(current, int):
            return self.handle_error("Invalid 'current' type")
        if isinstance(current, int) and (current < 0  or current > len(clean)):
            return self.handle_error("Invalid 'current' value")

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
        track("change_embeds", self.scope['user'], plenary.embeds, plenary=plenary)


    def handle_plenary(self, data, plenary):
        if not plenary.has_admin(self.scope['user']):
            return self.handle_error("Must be an admin to do that.")

        old_jitsi_server = plenary.jitsi_server
        old_admins = list(plenary.admins.all())
        payload = data['payload']
        try:
            update_plenary(plenary, payload)
            update_plenary_admins(plenary, payload)
        except ValidationError as e:
            self.handle_error(json_dumps(e.message_dict))

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
            return self.handle_error(json_dumps(e.message_dict))

        update = {key: getattr(plenary, key) for key in PLENARY_SIMPLE_UPDATE_KEYS}
        update.update({key: getattr(plenary, "safe_" + key)() for key in PLENARY_SANITIZED_KEYS})
        admins = list(plenary.admins.all())
        update['admins'] = [u.serialize_public() for u in admins]
        update['open'] = plenary.open
        update['image'] = plenary.image.url if plenary.image else None
        broadcast(plenary.channel_group_name, type='plenary', payload={'plenary': update})

        # Only sent to old ^ new admins
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

    #@require_payload_keys(['id'])
    #def handle_add_live_participant(message, data, plenary):
    #    if not plenary.has_admin(self.scope['user']):
    #        return self.handle_error("Must be an admin to do add live participants.")
    #
    #    try:
    #        user = User.objects.get(id=data['payload']['id'])
    #    except User.DoesNotExist:
    #        return self.handle_error("User not found.")
    #
    #    plenary.live_participants.add(user)
    #    payload = {
    #        'live_participants': list(
    #            plenary.live_participants.values_list('id', flat=True)
    #        )
    #    }
    #    broadcast(
    #        plenary.channel_group_name,
    #        type='live_participants',
    #        payload=payload
    #    )
    #    
    #
    #@require_payload_keys(['id'])
    #def handle_remove_live_participant(message, data, plenary):
    #    authorized = (
    #        (data['payload']['id'] == self.scope['user'].id) or
    #        plenary.has_admin(self.scope['user'])
    #    )
    #    if not authorized:
    #        return self.handle_error("Must be an admin to remove live participants other than yourself")
    #
    #    try:
    #        user = User.objects.get(id=data['payload']['id'])
    #    except User.DoesNotExist:
    #        return self.handle_error("User not found")
    #
    #    plenary.live_participants.remove(user)
    #    payload = {
    #        'live_participants': list(
    #            plenary.live_participants.values_list('id', flat=True)
    #        )
    #    }
    #    broadcast(
    #        plenary.channel_group_name,
    #        type='live_participants',
    #        payload=payload
    #    )

    def handle_contact_card(self, data, plenary):
        payload = data['payload']

        user = self.scope['user']
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
            return self.handle_error(json_dumps(e.message_dict))
        user.save()

        track("change_contact_card", self.scope['user'], plenary=plenary)

        msg = prepare_message(
            type="auth",
            payload=serialize_auth_state(user, plenary)
        )
        self.send(text_data=msg['text'])

        for room in Room.objects.filter(
                presence__user__id=user.id).distinct():
            broadcast(
                room.channel_name,
                type="users",
                payload={user.id: user.serialize_public()}
            )


    #@require_payload_keys(['action'])
    def handle_video_sync(self, data, plenary):
        if not plenary.has_admin(self.scope['user']):
            return self.handle_error("Must be an admin to control video sync")

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
            track("start_play_for_all", self.scope['user'], plenary=plenary)
        elif payload['action'] == "pause":
            VideoSync.objects.pause_for_all(
                sync_id=plenary.channel_group_name
            )
            track("stop_play_for_all", self.scope['user'], plenary=plenary)
        elif payload['action'] == "endSync":
            VideoSync.objects.end_sync(
                sync_id=plenary.channel_group_name
            )

    #@require_payload_keys(['message'])
    def handle_message_breakouts(self, data, plenary):
        if not plenary.has_admin(self.scope['user']):
            return self.handle_error("Must be an admin to message breakouts")

        msg_text = data['payload']['message']
        for breakout in plenary.breakout_set.active():
            broadcast(breakout.channel_group_name, type='message_breakouts',
                    payload={'message': msg_text})
        track("message_breakouts", self.scope['user'], {'message': msg_text}, plenary=plenary)

    #@require_payload_keys(['requestSpeakerStats'])
    def handle_request_speaker_stats(self, data, plenary):
        if not plenary.has_admin(self.scope['user']):
            return self.handle_error("Must be an admin to request speaker stats")

        for breakout in plenary.breakout_set.active():
            broadcast(breakout.channel_group_name, type='request_speaker_stats',
                    payload=data['payload'])


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


