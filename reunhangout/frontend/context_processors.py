import json

from django.conf import settings
from django.utils.safestring import mark_safe

def public_settings(request):
    return {
        'public_settings': {
            'PUBLIC_API_KEYS': settings.PUBLIC_API_KEYS,
            'BRANDING': settings.BRANDING,
            'LOGO_URL': '//%s%s%s' % (
                request.site.domain,
                settings.MEDIA_URL,
                settings.BRANDING['logo'],
            ),
        },
        'branding': settings.BRANDING,
    }
