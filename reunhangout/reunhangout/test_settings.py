from .dev_settings import *

INTERNAL_IPS = ['127.0.0.1']

PLENARY_SERVER = "https://plenary.unhangout.io"

for name in ('twitter', 'facebook', 'google'):
    if ALLAUTH_APP_KEYS[name]['client_id']:
        INSTALLED_APPS.append('allauth.socialaccount.providers.%s' % name)

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.PyLibMCCache',
        'LOCATION': '127.0.0.1:11211',
    }
}
