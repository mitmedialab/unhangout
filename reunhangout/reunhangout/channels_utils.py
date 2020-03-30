import functools
import json

from analytics.models import track
from reunhangout.utils import json_dumps

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def prepare_message(payload=None, error=None, type=None):
    obj = {}
    if payload is not None:
        obj['payload'] = payload
    if error:
        obj['error'] = error
    if type:
        obj['type'] = type
    return {'text': json_dumps(obj)}

def broadcast(group_name, **kwargs):
    msg = prepare_message(**kwargs)
    msg['type'] = 'forward_to_client'
    async_to_sync(get_channel_layer().group_send)(group_name, msg)

def send_to_channel(channel_name, **kwargs):
    msg = prepare_message(**kwargs)
    msg['type'] = 'forward_to_client'
    async_to_sync(get_channel_layer().send)(channel_name, msg)

def require_payload_keys(keylist):
    """
    Decorator to enforce that a message contains a 'payload' key with the given
    keylist as subkeys.
    """
    def decorator(fn):
        @functools.wraps(fn)
        def inner(message, data, *args, **kwargs):
            if 'payload' not in data:
                return handle_error(message, "Requires 'payload' key")
            if not isinstance(data['payload'], dict):
                return handle_error(message, "'payload' must be a dict")
            for key in keylist:
                if key not in data['payload']:
                    return handle_error(message, "Missing '%s' payload key." % key)
            return fn(message, data, *args, **kwargs)
        return inner
    return decorator

def serialize_room(room):
    return {
        'channel_name': room.channel_name,
        'members': [m.serialize_public() for m in room.get_users()],
        'lurkers': room.get_anonymous_count(),
    }
