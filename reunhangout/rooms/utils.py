import functools

from rooms.models import Connection

def touch_connection(func):
    @functools.wraps(func)
    def inner(message, *args, **kwargs):
        Connection.objects.touch(message.reply_channel.name)
        if message.content.get('text') == '"heartbeat"':
            return
        return func(message, *args, **kwargs)
    return inner

def remove_connection(func):
    @functools.wraps(func)
    def inner(message, *args, **kwargs):
        Connection.objects.leave_all(message.reply_channel.name)
        return func(message, *args, **kwargs)
    return inner
