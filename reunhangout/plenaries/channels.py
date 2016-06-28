import json

from channels import Group
from channels.sessions import enforce_ordering
from channels.auth import channel_session_user, channel_session_user_from_http

from plenaries.models import Plenary, ChatMessage
from rooms.models import Room

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
        handle_chat(message, data, path)
    else:
        message.reply_channel.send(json.dumps({
            "error": "Type not understood"
        }))

def handle_chat(message, data):
    path = message.channel_session['path']
    plenary = Plenary.objects.get_from_path(path)
    if plenary:
        chat_message = ChatMessage.objects.create(
            plenary=plenary,
            user=message.user,
            message=data['message'],
        )
        Group(path).send({
            'text': json.dumps({
                'type': 'chat', 'payload': chat_message.serialize()
            })
        })
    else:
        message.reply_channel.send(json.dumps({
            "error": "Plenary not found"
        }))
