import json

from django.conf import settings
from django.utils.safestring import mark_safe

def public_settings(request):
    return {
        'public_settings': {
            'PUBLIC_API_KEYS': settings.PUBLIC_API_KEYS,
            # Available in public settings key for javascript. (not duplicate)
            'BRANDING': settings.BRANDING,
            'LOGO_URL': '//%s%s%s' % (
                request.site.domain,
                settings.MEDIA_URL,
                settings.BRANDING['logo'],
            ),
            'PLENARY_SERVER': settings.PLENARY_SERVER,
            'MEDIA_URL': settings.MEDIA_URL,
            'JITSI_SERVERS': settings.JITSI_SERVERS,
        },
        # available as context processor for Django templates. (not duplicate)
        'branding': settings.BRANDING,
    }
