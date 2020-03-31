from .dev_settings import *
import os


env = lambda key, default: os.environ.get(key, default)

INTERNAL_IPS = ['127.0.0.1']

PLENARY_SERVER = "https://plenary.unhangout.io"

for name in ('twitter', 'facebook', 'google'):
    if ALLAUTH_APP_KEYS[name]['client_id']:
        INSTALLED_APPS.append('allauth.socialaccount.providers.%s' % name)

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('POSTGRES_DB', 'unhangout'),
        'USER': env('POSTGRES_USER', 'unhangout'),
        'PASSWORD': env('POSTGRES_PASSWORD', 'password'),
        'HOST': env('POSTGRES_HOST', '127.0.0.1'),
        'PORT': env('POSTGRES_PORT', '5432'),
    }
}

#CACHES = {
#    'default': {
#        'BACKEND': 'django.core.cache.backends.memcached.PyLibMCCache',
#        'LOCATION': '127.0.0.1:11211',
#    }
#}
