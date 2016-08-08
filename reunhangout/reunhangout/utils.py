import json
from django.core.serializers.json import DjangoJSONEncoder

def json_dumps(obj):
    return json.dumps(obj, cls=DjangoJSONEncoder)
