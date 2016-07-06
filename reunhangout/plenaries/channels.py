import json
from urllib.parse import urlparse

from channels import Group
from channels.sessions import enforce_ordering
from channels.auth import channel_session_user, channel_session_user_from_http

from plenaries.models import Plenary, ChatMessage
from rooms.models import Room
from breakouts.models import Breakout

import pdb

@enforce_ordering(slight=True)
@channel_session_user_from_http
def ws_connect(message):
    path = message.content['path'].decode('utf-8')
    message.channel_session['path'] = path
    group = Group(path)
    group.add(message.reply_channel)
    room = Room.objects.add(path, message.user)
    group.send({
        'text': json.dumps({
            'type': 'present',
            'payload': room.serialize()
        })
    })

@enforce_ordering(slight=True)
@channel_session_user
def ws_disconnect(message):
    path = message.channel_session['path']
    group = Group(path)
    group.discard(message.reply_channel)
    room = Room.objects.remove(path, message.user)
    if room:
        group.send({
            'text': json.dumps({
                'type': 'present',
                'payload': room.serialize()
            })
        })


@enforce_ordering(slight=True)
@channel_session_user
def ws_receive(message):
    try:
        data = json.loads(message.content['text'])
    except ValueError:
        message.reply_channel.send(json.dumps({
            "error": "Message body must be json."
        }))
        return
    route_message(message, data)

def route_message(message, data):
    if data['type'] == "chat":
        handle_chat(message, data)
    elif data['type'] == "embeds":
        pdb.set_trace()
        handle_embeds(message, data)
    elif data['type'] == "breakout_create":
        handle_breakout_create(message, data)
    else:
        message.reply_channel.send(json.dumps({
            "error": "Type not understood"
        }))

def handle_error(message, error):
    message.reply_channel.send({'text': json.dumps({"error": error})})

def handle_chat(message, data):
    path = message.channel_session['path']
    plenary = Plenary.objects.get_from_path(path)
    if plenary:
        if 'payload' not in data or 'message' not in data['payload']:
            return handle_error(message, "Requires payload with 'payload' key and 'message' subkey")
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
        Group(path).send({
            'text': json.dumps({
                'type': 'chat', 'payload': chat_message.serialize()
            })
        })
    else:
        return handle_error(message, "Plenary not found")

def handle_embeds(message, data):
    path = message.channel_session['path']
    plenary = Plenary.objects.get_from_path(path)
    if not plenary:
        return handle_error(message, "Plenary not found")
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

    plenary.embeds = {
        'embeds': clean,
        'current': current
    }
    plenary.save()
    Group(path).send({
        'text': json.dumps({
            'type': 'embeds', 'payload': plenary.embeds
        })
    })
def handle_breakout_create(message, data):
    path = message.channel_session['path']
    plenary = Plenary.objects.get_from_path(path)
    if plenary:
        if 'payload' not in data or 'title' not in data['payload']:
            return handle_error(message, "Requires payload with 'payload' key and 'message' subkey")
        breakout = Breakout.objects.create(
            plenary=plenary,
            title=data['payload']['title'],
            slug='/',
            max_attendees=data['payload']['max_attendees']
        )
        Group(path).send({
            'text': json.dumps({
                'type': 'breakout_receive', 'payload': breakout.serialize()
            })
        })
    else:
        return handle_error(message, "Plenary not found")



