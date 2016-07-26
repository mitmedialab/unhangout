import json
from urllib.parse import urlparse

from channels import Group
from channels.sessions import enforce_ordering
from channels.auth import channel_session_user, channel_session_user_from_http

from rooms.models import Room

@enforce_ordering(slight=True)
@channel_session_user_from_http
def ws_connect(message):
    path = message.content['path'].replace('/', '__')
    message.channel_session['path'] = path
    Group(path).add(message.reply_channel)
    room = Room.objects.add(path, message.user, message.reply_channel.name)
    room.broadcast_presence()

@enforce_ordering(slight=True)
@channel_session_user
def ws_disconnect(message):
    path = message.channel_session['path']
    Group(path).discard(message.reply_channel)
    room = Room.objects.remove(path, message.user, message.reply_channel.name)
    room.broadcast_presence()
