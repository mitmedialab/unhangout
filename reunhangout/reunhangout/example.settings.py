from .dev_settings import *

# To use Django Debug Toolbar, uncomment this:
#INSTALLED_APPS += ['debug_toolbar']

PLENARY_SERVER = "http://localhost:8000"

# Instructions for obtaining the youtube api key:
# https://developers.google.com/youtube/v3/getting-started
# Enable "YouTube Data API v3".
PUBLIC_API_KEYS['youtube'] = 'change-this-in-settings.py'

# Add client id's and secrets for social account providers. Changes only take
# effect when you sync them to the database with `./manage.py sync_auth_providers`.
ALLAUTH_APP_KEYS['twitter']['client_id'] = ''
ALLAUTH_APP_KEYS['twitter']['secret'] = ''
ALLAUTH_APP_KEYS['facebook']['client_id'] = ''
ALLAUTH_APP_KEYS['facebook']['secret'] = ''
ALLAUTH_APP_KEYS['google']['client_id'] = ''
ALLAUTH_APP_KEYS['google']['secret'] = ''

# Add INSTALLED_APPS for any in-use social account providers.
for name, keys in ALLAUTH_APP_KEYS.items():
    if keys['client_id']:
        INSTALLED_APPS.append('allauth.socialaccount.providers.%s' % name)
