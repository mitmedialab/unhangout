from .default_settings import *

DEBUG = THUMBNAIL_DEBUG = True

# Allow insecure passwords in dev.
AUTH_PASSWORD_VALIDATORS = []

WEBPACK_LOADER = {
    'DEFAULT': {
        'CACHE': not DEBUG,
        'BUNDLE_DIR_NAME': 'bundles/',
        'STATS_FILE': os.path.join(BASE_DIR, 'static', 'dev', 'webpack-stats.json'),
        'POLL_INTERVAL': 0.1,
        'IGNORE': ['.+\.hot-update.js', '.+\.map']
    }
}

EMAIL_HOST = "localhost"
EMAIL_PORT = 1025
#EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# TODO use dj_database_url
import os
env = lambda key, default: os.environ.get(key, default)
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
