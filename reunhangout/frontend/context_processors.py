import json

from django.conf import settings
from django.utils.safestring import mark_safe

def public_settings(request):
    return {'public_settings': mark_safe(json.dumps({
        'PUBLIC_API_KEYS': settings.PUBLIC_API_KEYS,
    }))}
