import functools
import json

from channels import Group
from django.core.serializers.json import DjangoJSONEncoder
from analytics.models import track

def prepare_message(payload=None, error=None, type=None):
    obj = {}
    if payload:
        obj['payload'] = payload
    if error:
        obj['error'] = error
    if type:
        obj['type'] = type
    return {'text': json.dumps(obj, cls=DjangoJSONEncoder)}

def broadcast(group_name, **kwargs):
    Group(group_name).send(prepare_message(**kwargs))

def handle_error(message, error):
    data = prepare_message(type='error', error=error)
    message.reply_channel.send(data)
    track("error", message.user, data)

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

def send_over_capacity_error(message, channel_name):
    return _join_error(message, channel_name, "over-capacity", "Over capacity")

def send_already_connected_error(message, channel_name):
    return _join_error(message, channel_name, "already-connected", "Already connected")

def _join_error(message, channel_name, error_code, error_msg):
    data = {
        'channel_name': channel_name,
        'members': [],
        'error': error_msg,
        "error_code": error_code,
    }
    message.reply_channel.send(prepare_message(
        type='presence',
        payload=data
    ))
    track("error", message.user, data)

def serialize_room(room):
    return {
        'channel_name': room.channel_name,
        'members': [m.serialize_public() for m in room.get_users()],
        'lurkers': room.get_anonymous_count(),
    }
