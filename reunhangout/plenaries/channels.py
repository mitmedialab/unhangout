from channels import Group
from channels.sessions import enforce_ordering
from channels.auth import channel_session_user, channel_session_user_from_http

@enforce_ordering(slight=True)
@channel_session_user_from_http
def ws_connect(message):
    path = str(message.content['path']).strip("/")
    print(path)
    room = 'chat-%s' % path
    print(room)
    message.channel_session['room'] = room
    Group(room).add(message.reply_channel)

@enforce_ordering(slight=True)
@channel_session_user
def ws_disconnect(message):
    Group(message.channel_session['room']).discard(message.reply_channel)

@enforce_ordering(slight=True)
@channel_session_user
def ws_receive(message):
    Group(message.channel_session['room']).send({
        'text': message.content['text']
    })


