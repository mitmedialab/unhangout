import json
from urllib.parse import urlparse

from channels import Group
from channels.sessions import enforce_ordering
from channels.auth import channel_session_user, channel_session_user_from_http

from rooms.models import Room
from rooms.utils import remove_connection

@remove_connection
@enforce_ordering(slight=True)
@channel_session_user
def ws_disconnect(message, **kwargs):
    """
    Generic room disconnection
    """
    channel_group_name = message.channel_session.get('channel_group_name', None)
    if channel_group_name:
        Group(channel_group_name).discard(message.reply_channel)
