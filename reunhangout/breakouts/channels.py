import json

from channels.sessions import enforce_ordering
from channels.auth import channel_session_user, channel_session_user_from_http

from breakouts.models import Breakout
from rooms.models import Room

@enforce_ordering(slight=True)
@channel_session_user_from_http
def ws_connect(message, breakout_id):
    if not message.user.is_authenticated():
        return handle_error(message, "Authentication required")

    try:
        breakout = Breakout.objects.get(pk=breakout_id)
    except Breakout.DoesNotExist:
        return handle_error(message,  'Breakout not found')

    message.channel_session['path'] = breakout.channel_group_name
    group = Group(message.channel_session['path'])

    num_connections = len(group.channel_layer.group_channels(group.name))
    # Enforce max attendees.
    if num_connections >= breakout.max_attendees:
        return handle_error(message, 'Over capacity')
    else:
        # Only one connection per user.
        room = Room.objects.get(path=group.name)
        if room.connection_set.filter(user=message.user).exists():
            return handle_error(message, "Already connected")

    group.add(message.reply_channel)
    room = Room.objects.add(group.name, message.user, message.reply_channel.name)
    room.broadcast_presence()

@enforce_ordering(slight=True)
@channel_session_user
def ws_receive(message, breakout_id):
    try:
        data = json.loads(message.content['text'])
    except ValueError:
        message.reply_channel.send(json.dumps({
            "error": "Message body must be json."
        }))

    try:
        breakout = Breakout.objects.get(id=breakout_id)
    except Breakout.DoesNotExist:
        return handle_error("Breakout not found")

    route_message(message, data, breakout)

def handle_error(message, error):
    message.reply_channel.send({'text': json.dumps({"error": error})})

def route_message(message, data, breakout):
    pass
