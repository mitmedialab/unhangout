import random
import json
from django.core.serializers.json import DjangoJSONEncoder

def json_dumps(obj):
    # Replace all '/' with '\\/'.  JSON allows optionally escaping the /
    # character, and if we don't, printing this as a JSON data structure in a
    # script tag allows a malicious '</script>' to close the tag early and XSS
    # us!
    return json.dumps(obj, cls=DjangoJSONEncoder).replace("/", "\\/")

def random_webrtc_id(length=32):
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    r = random.SystemRandom()
    return ''.join(r.choice(alphabet) for i in range(length))

