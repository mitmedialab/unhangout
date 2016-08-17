import json

from channels.sessions import enforce_ordering
from channels.auth import channel_session_user, channel_session_user_from_http

from breakouts.models import Breakout
from channels_presence.models import Room, Presence
from channels_presence.decorators import touch_presence, remove_presence
from reunhangout.channels_utils import (
    send_over_capacity_error, send_already_connected_error, handle_error
)

@enforce_ordering(slight=True)
@channel_session_user_from_http
def ws_connect(message, breakout_id):
    if not message.user.is_authenticated():
        return handle_error(message, "Authentication required")

    try:
        breakout = Breakout.objects.get(pk=breakout_id)
    except Breakout.DoesNotExist:
        return handle_error(message,  'Breakout not found')

    num_connections = Presence.objects.filter(
            room__channel_name=breakout.channel_group_name).count()

    # Enforce max attendees.
    if num_connections >= breakout.max_attendees:
        return send_over_capacity_error(message, breakout.channel_group_name)

    elif message.user.is_authenticated() and Presence.objects.filter(
                room__channel_name=breakout.channel_group_name,
                user=message.user
            ).exists():
        # Only one connection per user.
        return send_already_connected_error(message, breakout.channel_group_name)

    room = Room.objects.add(group.name, message.reply_channel.name, message.user)
    message.channel_session['breakout_id'] = breakout.id
    track("join_breakout", message.user, breakout=breakout)

@remove_presence
@channel_session_user
def ws_disconnect(message):
    if message.channel_session.get('breakout_id'):
        try:
            breakout = Breakout.objects.get(pk=message.channel_session['breakout_id'])
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
        message.reply_channel.send(json.dumps({
            "error": "Message body must be json."
        }))

    try:
        breakout = Breakout.objects.get(id=breakout_id)
    except Breakout.DoesNotExist:
        return handle_error(message, "Breakout not found")

    route_message(message, data, breakout)

def route_message(message, data, breakout):
    pass
