import json

from channels.sessions import enforce_ordering
from channels.auth import channel_session_user, channel_session_user_from_http
from channels import Channel

from breakouts.models import Breakout
from channels_presence.models import Room, Presence
from channels_presence.decorators import touch_presence, remove_presence
from reunhangout.channels_utils import (
    send_over_capacity_error, send_already_connected_error, handle_error,
    prepare_message
)
from reunhangout.utils import json_dumps
from analytics.models import track

@enforce_ordering(slight=True)
@channel_session_user_from_http
def ws_connect(message, breakout_id):
    if not message.user.is_authenticated():
        return handle_error(message, "Authentication required")
    try:
        breakout = Breakout.objects.get(pk=breakout_id)
    except Breakout.DoesNotExist:
        return handle_error(message,  'Breakout not found')

    connect_to_breakout(message, breakout)

def connect_to_breakout(message, breakout):
    num_connections = Presence.objects.filter(
            room__channel_name=breakout.channel_group_name).count()

    # Enforce max attendees.
    if num_connections >= breakout.max_attendees:
        return send_over_capacity_error(message, breakout.channel_group_name)

    elif message.user.is_authenticated() and Presence.objects.filter(
                room__channel_name__startswith=Breakout.CHANNEL_GROUP_NAME_PREFIX,
                user=message.user
            ).exists():
        # Only one connection per user.
        return send_already_connected_error(message, breakout.channel_group_name)

    room = Room.objects.add(breakout.channel_group_name,
            message.reply_channel.name, message.user)
    track("join_breakout", message.user, breakout=breakout)

@remove_presence
@channel_session_user
def ws_disconnect(message, breakout_id=None):
    if breakout_id:
        try:
            breakout = Breakout.objects.get(pk=breakout_id)
        except Breakout.DoesNotExist:
            breakout = None
        track("leave_breakout", message.user, breakout=breakout)

@touch_presence
@enforce_ordering(slight=True)
@channel_session_user
def ws_receive(message, breakout_id):
    try:
        data = json.loads(message.content['text'])
    except ValueError:
        message.reply_channel.send(json_dumps({
            "error": "Message body must be json."
        }))

    try:
        breakout = Breakout.objects.get(id=breakout_id)
    except Breakout.DoesNotExist:
        return handle_error(message, "Breakout not found")

    route_message(message, data, breakout)

def route_message(message, data, breakout):
    if 'type' not in data:
        handle_error(message, "Missing type")
    elif data['type'] == "DISCONNECTING_OTHERS":
        handle_disconnecting_others(message, data, breakout)
    else:
        handle_error(message, "Type not understood")

class MessageProxy(object):
    def __init__(self, channel_name, user):
        self.reply_channel = Channel(channel_name)
        self.user = user

def handle_disconnecting_others(message, data, breakout):
    if not message.user.is_authenticated():
        handle_error(message, "Can't disconnect others when not authenticated")
        return

    presences = Presence.objects.filter(
        room__channel_name__startswith=Breakout.CHANNEL_GROUP_NAME_PREFIX,
        user=message.user
    )
    for presence in presences:
        if presence.channel_name != message.reply_channel.name:
            presence.room.remove_presence(presence=presence)
            send_already_connected_error(
                MessageProxy(presence.channel_name, user=message.user),
                presence.room.channel_name
            )

    connect_to_breakout(message, breakout)

