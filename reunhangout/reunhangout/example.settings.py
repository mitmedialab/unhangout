from .dev_settings import *

# To use Django Debug Toolbar, uncomment this:
#INSTALLED_APPS += ['debug_toolbar']

# Instructions for obtaining the youtube api key:
# https://developers.google.com/youtube/v3/getting-started
# Enable "YouTube Data API v3".
PUBLIC_API_KEYS['youtube'] = 'change-this-in-settings.py'

# Add client id's and secrets for social account providers. Changes only take
# effect when you sync them to the database with `./manage.py sync_auth_providers`.
ALLAUTH_APPS['twitter']['client_id'] = ''
ALLAUTH_APPS['twitter']['secret'] = ''
ALLAUTH_APPS['facebook']['client_id'] = ''
ALLAUTH_APPS['facebook']['secret'] = ''
ALLAUTH_APPS['google']['client_id'] = ''
ALLAUTH_APPS['google']['secret'] = ''

# Add INSTALLED_APPS for any in-use social account providers.
for name, keys in ALLAUTH_APPS.items()
    if keys['client_id']:
        INSTALLED_APPS.append('allauth.socialaccount.providers.%s' % name)
