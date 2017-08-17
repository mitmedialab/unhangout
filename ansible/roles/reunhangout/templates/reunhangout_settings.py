from .prod_settings import *

ALLOWED_HOSTS = ['{{ django_domain }}']

DEFAULT_FROM_EMAIL = SERVER_EMAIL = "noreply@{{ django_domain }}"
ADMINS = MANAGERS = [("Charlie DeTar", "cfd@media.mit.edu")]

PLENARY_SERVER = 'https://plenary.unhangout.io'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': '{{ django_postgres_db }}',
        'USER': '{{ django_postgres_user }}',
        'PASSWORD': '{{ django_postgres_password }}'
    }
}

# Instructions for obtaining the youtube api key:
# https://developers.google.com/youtube/v3/getting-started
# Enable "YouTube Data API v3".
PUBLIC_API_KEYS['youtube'] = '{{ youtube_api_key }}'

ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'
# Add client id's and secrets for social account providers. Changes only take
# effect when you sync them to the database with `./manage.py sync_auth_providers`.
ALLAUTH_APP_KEYS['twitter']['client_id'] = '{{ twitter_client_id }}'
ALLAUTH_APP_KEYS['twitter']['secret'] = '{{ twitter_secret }}'
ALLAUTH_APP_KEYS['facebook']['client_id'] = '{{ facebook_client_id }}'
ALLAUTH_APP_KEYS['facebook']['secret'] = '{{ facebook_secret }}'
ALLAUTH_APP_KEYS['google']['client_id'] = '{{ google_client_id }}'
ALLAUTH_APP_KEYS['google']['secret'] = '{{ google_secret }}'

# Add INSTALLED_APPS for any in-use social account providers.
for name, keys in ALLAUTH_APP_KEYS.items():
    if keys['client_id']:
        INSTALLED_APPS.append('allauth.socialaccount.providers.%s' % name)

## Debugging
#DEBUG = True
#INSTALLED_APPS += ['debug_toolbar']
#INTERNAL_IPS = ['127.0.0.1']
#DEBUG_TOOLBAR_CONFIG = {
#    'SHOW_TOOLBAR_CALLBACK': lambda request: not request.is_ajax() and request.META.get('HTTP_X_FORWARDED_FOR', None) in INTERNAL_IPS
#}

ETHERPAD_SERVER = "{{etherpad_domain}}"
