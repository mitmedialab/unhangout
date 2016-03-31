from django.http import UnreadablePostError

from .default_settings import *

DEBUG = THUMBNAIL_DEBUG = False

ALLOWED_HOSTS = ["localhost"]

WEBPACK_LOADER = {
    'DEFAULT': {
        'BUNDLE_DIR_NAME': 'dist/',
        'STATS_FILE': os.path.join(BASE_DIR, 'static', 'webpack-stats-prod.json')
    }
}

def skip_unreadable_post(record):
    if record.exc_info:
        exc_type, exc_value = record.exc_info[:2]
        if isinstance(exc_value, UnreadablePostError):
            return False
    return True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s'
        },
        'simple': {
            'format': '%(levelname)s %(message)s'
        },
    },
    'handlers': {
        'console':{
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'log_file':{
            'level': 'DEBUG',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(os.path.dirname(BASE_DIR), 'logs', 'django.log'),
            'maxBytes': 16777216, # 16megabytes
            'formatter': 'verbose'
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'include_html': True,
            'filters': ['require_debug_false', 'skip_unreadable_posts'],
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins', 'log_file', 'console'],
            'level': 'ERROR',
            'propagate': True,
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        },
        'skip_unreadable_posts': {
            '()': 'django.utils.log.CallbackFilter',
            'callback': skip_unreadable_post
        }
    }
}

