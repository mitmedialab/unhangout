import json
from urllib.parse import urlparse
from django.core.exceptions import ValidationError
from django.db.models import F, Count
from django.db import transaction

from channels import Group
from channels.sessions import enforce_ordering
from channels.auth import channel_session_user, channel_session_user_from_http

from plenaries.models import Plenary, ChatMessage
from breakouts.models import Breakout
from rooms.models import Room
from videosync.models import VideoSync
from reunhangout.utils import json_dumps

import pdb

def require_payload_keys(keylist):
    """
    Decorator to enforce that a message contains a 'payload' key with the given
    keylist as subkeys.
    """
    def wrapper(fn):
        def handler(message, data, *args, **kwargs):
            if 'payload' not in data:
                return handle_error(message, "Requires 'payload' key")
            if not isinstance(data['payload'], dict):
                return handle_error(message, "'payload' must be a dict")
            for key in keylist:
                if key not in data['payload']:
                    return handle_error(message, "Missing '%s' payload key." % key)
            return fn(message, data, *args, **kwargs)
        return handler
    return wrapper

@enforce_ordering(slight=True)
@channel_session_user_from_http
def ws_connect(message, slug):
    if not message.user.is_authenticated():
        return handle_error(message, "Authentication required")
    try:
        plenary = Plenary.objects.get(slug=slug)
    except Plenary.DoesNotExist:
        return handle_error(message,  'Plenary not found')
        
    message.channel_session['path'] = plenary.channel_group_name
    group = Group(message.channel_session['path'])

    # Here would be the place for enforcing a connection/user cap or other
    # auth, if such were needed.

    group.add(message.reply_channel)
    room = Room.objects.add(group.name, message.user, message.reply_channel.name)
    room.broadcast_presence()

@enforce_ordering(slight=True)
@channel_session_user
def ws_receive(message, slug):
    try:
        data = json.loads(message.content['text'])
    except ValueError:
        return handle_error(message, "Message body must be json")
    try:
        plenary = Plenary.objects.get(slug=slug)
    except Plenary.DoesNotExist:
        return handle_error(message, "Plenary not found")
    route_message(message, data, plenary)

def handle_error(message, error):
    message.reply_channel.send({'text': json_dumps({"error": error})})

def route_message(message, data, plenary):
    if 'type' not in data:
        handle_error(message, "Missing type")
    elif data['type'] == "chat":
        handle_chat(message, data, plenary)
    elif data['type'] == "embeds":
        handle_embeds(message, data, plenary)
    elif data['type'] == "breakout":
        handle_breakout(message, data, plenary)
    elif data['type'] == "plenary":
        handle_plenary(message, data, plenary)
    elif data['type'] == "auth":
        handle_auth(message, data, plenary)
    elif data['type'] == 'videosync':
        handle_video_sync(message, data, plenary)
    else:
        handle_error(message, "Type not understood")

@require_payload_keys(['message'])
def handle_chat(message, data, plenary):
    highlight = (
        data['payload'].get('highlight') and \
        (message.user.is_superuser or plenary.has_admin(message.user))
    )
    chat_message = ChatMessage.objects.create(
        plenary=plenary,
        user=message.user,
        message=data['payload']['message'],
        highlight=highlight
    )
    Group(plenary.channel_group_name).send({
        'text': json_dumps({
            'type': 'chat', 'payload': chat_message.serialize()
        })
    })

@require_payload_keys('embeds')
def handle_embeds(message, data, plenary):
    if not plenary.has_admin(message.user):
        return handle_error(message, "Must be an admin to set embeds")

    error = None
    clean = []
    for embed in data.get('payload', {}).get('embeds', []):
        if not isinstance(embed, dict) or not isinstance(embed.get('props'), dict):
            error = "Malformed embed"
        elif embed.get('type') not in ("youtube", "url"):
            error = "Invalid type: {}".format(embed['type'])
        else:
            parsed = urlparse(embed['props']['src'])
            if parsed.scheme != "https":
                error = "Only https URLs allowed"
        if error:
            return handle_error(message, error)
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
    if plenary.embeds and plenary.embeds.current != current:
        VideoSync.objects.stop(self.channel_group_name)

    plenary.embeds = {
        'embeds': clean,
        'current': current
    }
    plenary.save()
    Group(plenary.channel_group_name).send({
        'text': json_dumps({
            'type': 'embeds', 'payload': plenary.embeds
        })
    })

@require_payload_keys(['action'])
def handle_breakout(message, data, plenary):
    is_admin = plenary.has_admin(message.user)
    admin_required_error = lambda: handle_error(message, "Must be an admin to do that.")

    payload = data['payload']
    action = payload['action']

    if not is_admin and not (
            plenary.breakout_mode == "user" or
            (plenary.breakout_mode == "randomize" and action == "group_me")):
        return admin_required_error()

    def respond_with_breakouts():
        # Not-too-efficient strategy: always respond with the full list of
        # breakouts from a new database query.  We can optimize this later if
        # needed.
        Group(plenary.channel_group_name).send({
            'text': json_dumps({
                'type': 'breakout_receive',
                'payload': [b.serialize() for b in plenary.breakout_set.all()]
            })
        })

    # Handle actions

    if action == 'create':
        if not is_admin and plenary.breakout_mode != "user":
            return admin_required_error()
        if 'title' not in payload:
            return handle_error(message, "Missing 'title'")
        breakout = Breakout.objects.create(
            plenary=plenary,
            title=payload['title'],
            max_attendees=payload.get('max_attendees') or 10,
            is_proposal=(not is_admin or payload.get('is_proposal', False))
        )
        return respond_with_breakouts()

    elif action == 'group_me':
        if plenary.breakout_mode != "randomize":
            return handle_error(message, "Must be in randomize mode to do that.")
        blacklist = set()
        # Remove membership, if any, from current breakouts
        for breakout in plenary.breakout_set.filter(members=message.user):
            breakout.members.remove(message.user)
            # Add to blacklist so we don't just rejoin this group.
            blacklist.add(breakout.id)

        # Place in an existing breakout, if available
        available_random_breakouts = plenary.breakout_set.exclude(
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
                    max_attendees=plenary.randomized_max_attendees,
                    is_random=True)
        breakout.members.add(message.user)
        return respond_with_breakouts()

    # For all actions other than create, we expect payload['id'] to contain the
    # id of the breakout to operate on.

    try:
        breakout = plenary.breakout_set.get(id=payload['id'])
    except (Breakout.DoesNotExist, KeyError):
        return handle_error(message, "Breakout not found.")

    if action == 'delete':
        if not is_admin:
            return admin_required_error()
        breakout.delete()
        return respond_with_breakouts()

    elif action == 'modify':
        if not is_admin:
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
        return respond_with_breakouts()

@require_payload_keys([])
def handle_plenary(message, data, plenary):
    if not plenary.has_admin(message.user):
        return handle_error(message, "Must be an admin to do that.")

    payload = data['payload']
    simple_update_keys = ('randomized_max_attendees', 'breakout_mode', 'name',
            'organizer', 'start_date')
    sanitized_keys = ('whiteboard', 'description')

    for key in simple_update_keys + sanitized_keys:
        if key in payload:
            setattr(plenary, key, payload[key])

    try:
        with transaction.atomic():
            plenary.full_clean()
            plenary.save()
            if 'randomized_max_attendees' in payload:
                # Not using queryset.update here, because we want to be able to rely on
                # signals for eventual use of django-channels data binding:
                # http://channels.readthedocs.io/en/latest/binding.html
                for breakout in plenary.breakout_set.filter(is_random=True):
                    breakout.max_attendees = plenary.randomized_max_attendees
                    breakout.full_clean()
                    breakout.save()
    except ValidationError as e:
        print(e)
        return handle_error(message, json_dumps(e.message_dict))

    update = {key: getattr(plenary, key) for key in simple_update_keys}
    update.update({key: getattr(plenary, "safe_" + key)() for key in sanitized_keys})
    Group(plenary.channel_group_name).send({
        'text': json_dumps({
            'type': 'plenary',
            'payload': {'plenary': update}
        })
    })

@require_payload_keys([])
def handle_auth(message, data, plenary):
    payload = data['payload']

    user = message.user
    for key in ['email', 'twitter_handle', 'linkedin_profile', 'share_info']:
        if key in payload:
            setattr(user, key, payload[key])

    try:
        user.full_clean()
    except ValidationError as e:
        return handle_error(message, json_dumps(e.message_dict))

    user.save()

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
        start_index = payload.get('start_index', 0)
        VideoSync.objects.start(
            sync_id=plenary.channel_group_name,
            channel_group_name=plenary.channel_group_name,
            time_index=start_index
        )
    elif payload['action'] == "pause":
        VideoSync.objects.stop(
            sync_id=plenary.channel_group_name
        )
