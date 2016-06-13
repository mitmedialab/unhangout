import json

from channels import Group
from channels.sessions import enforce_ordering
from channels.auth import channel_session_user, channel_session_user_from_http

from plenaries.models import Plenary, ChatMessage

@enforce_ordering(slight=True)
@channel_session_user_from_http
def ws_connect(message):
    path = message.content['path'].decode('utf-8')
    message.channel_session['path'] = path
    Group(path).add(message.reply_channel)

@enforce_ordering(slight=True)
@channel_session_user
def ws_disconnect(message):
    Group(message.channel_session['path']).discard(message.reply_channel)

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

    print(data)

    path = message.channel_session['path']
    plenary = Plenary.objects.get_from_path(path)
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
