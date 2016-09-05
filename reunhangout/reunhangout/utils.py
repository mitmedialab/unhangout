import random
import json
from django.core.serializers.json import DjangoJSONEncoder

def json_dumps(obj):
    return json.dumps(obj, cls=DjangoJSONEncoder)

def random_webrtc_id(length=32):
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    r = random.SystemRandom()
    return ''.join(r.choice(alphabet) for i in range(length))

