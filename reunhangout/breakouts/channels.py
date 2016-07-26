import json

from channels.sessions import enforce_ordering
from channels.auth import channel_session_user

from breakouts.models import Breakout

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
