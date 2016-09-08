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
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
