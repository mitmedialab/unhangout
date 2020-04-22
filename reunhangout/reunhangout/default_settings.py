"""
Django settings for reunhangout project.
"""
import os
from datetime import timedelta


# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = lambda key, default=None: os.environ.get(key, default)

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.9/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY', '^m7!_+vj@cm0du#6k92^q41#&pyadk(mo+gukeisj4)fg8ggfj')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = THUMBNAIL_DEBUG = False

ALLOWED_HOSTS = []
if env('DOMAIN'):
    ALLOWED_HOSTS = [env('DOMAIN')]

# Application definition

INSTALLED_APPS = [
    'accounts',
    'analytics',
    'breakouts',
    'frontend',
    'plenaries',
    'videosync',

    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'bootstrapform',
    'channels',
    'channels_presence',
    'django_gravatar',
    'django_celery_beat',
    'django_celery_results',
    'escapejson',
    'mjml',
    'sorl.thumbnail',
    'webpack_loader',

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.sites',
    'django.contrib.staticfiles',
]

MIGRATION_MODULES = {
    'thumbnail': 'frontend.sorl_migrations',
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.contrib.sites.middleware.CurrentSiteMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'reunhangout.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.media',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'frontend.context_processors.public_settings',
            ],
        },
    }
]

WSGI_APPLICATION = 'reunhangout.wsgi.application'

# Database
# https://docs.djangoproject.com/en/1.9/ref/settings/#databases
# TODO use dj_database_url
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

# Password validation
# https://docs.djangoproject.com/en/1.9/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
)

# Internationalization
# https://docs.djangoproject.com/en/1.9/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True

SITE_ID = 1
AUTH_USER_MODEL = 'accounts.User'

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.9/howto/static-files/
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'public')
STATICFILES_DIRS = [os.path.join(BASE_DIR, "static")]
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Channels
ASGI_APPLICATION = 'reunhangout.routing.application'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [
                (env("REDIS_HOST", '127.0.0.1'), env("REDIS_PORT", 6379) )
            ],
        },
    },
}

# Celery
CELERY_RESULT_BACKEND = 'django-db'
CELERYBEAT_SCHEDULE = {
    'video-sync': {
        'task': 'videosync.tasks.tick',
        'schedule': timedelta(seconds=15),
    },
    'prune-presence': {
        'task': 'channels_presence.tasks.prune_presence',
        'schedule': timedelta(seconds=60),
    },
    'prune-rooms': {
        'task': 'channels_presence.tasks.prune_rooms',
        'schedule': timedelta(seconds=600),
    },
}
CELERYBEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
BROKER_URL = env("BROKER_URL", "redis://localhost:6379/0")

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': { 'access_type': 'online' }
    },
    'facebook': {
        'METHOD': 'oauth2',
        'SCOPE': ['email', 'public_profile'],
        'FIELDS': [
            'id',
            'email',
            'name',
            'first_name',
            'last_name',
            'verified',
            'locale',
            'timezone',
            'link',
            'updated_time'
        ],
        'EXCHANGE_TOKEN': True,
        'VERSION': 'v2.4'
    },
}
ACCOUNT_USER_DISPLAY = "accounts.models.user_display"
ACCOUNT_AUTHENTICATION_METHOD = "username_email"
LOGIN_REDIRECT_URL = "/events/"

# Add client id's and secrets for social account providers. Changes only take
# effect when you sync them to the database with `./manage.py sync_auth_providers`.
ALLAUTH_APP_KEYS = {
    'twitter': {'client_id': '', 'secret': ''},
    'facebook': {'client_id': '', 'secret': ''},
    'google': {'client_id': '', 'secret': ''},
}

# API keys for 3rd party services.  Don't put auth API keys here; put them in
# ALLAUTH_APP_KEYS.

# Instructions for obtaining the youtube api key:
# https://developers.google.com/youtube/v3/getting-started
# Enable "YouTube Data API v3".
PUBLIC_API_KEYS = {
    'youtube': env('YOUTUBE_API_KEY', ''), # Define in settings.py
}

# TODO remove this variable
PLENARY_SERVER = 'https://plenary.unhangout.io'
BRANDING = {
    'logo': 'assets/unhangout-logo-FULL-simple.svg',
    'logo_png': 'assets/unhangout-logo-FULL-simple.png',
    'short_logo_indigo': 'assets/unhangout-logo-UN-indigo.svg',
    'short_logo_seafoam': 'assets/unhangout-logo-UN-seafoam.svg',
    'name': 'Unhangout',
    'default_avatar': "assets/default_avatar.jpg",
}
JITSI_SERVERS = [
    'meet.jit.si',
    'jitsi.unhangout.io',
]
ETHERPAD_SERVER = env('ETHERPAD_SERVER', "etherpad.unhangout.io")
ETHERPAD_API_KEY = env('ETHERPAD_API_KEY', "... override me ...")
ETHERPAD_DEFAULT_TEXT = "Welcome to the breakout! Use this space for notes or ideas."

MJML_EXEC_CMD = os.path.join(BASE_DIR, "node_modules", ".bin", "mjml")

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env('EMAIL_HOST', '')
EMAIL_HOST_USER = env('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', '')
MAILGUN_ACTIVE_API_KEY = env('MAILGUN_ACTIVE_API_KEY', '')

WEBPACK_LOADER = {
    'DEFAULT': {
        'BUNDLE_DIR_NAME': 'dist/',
        'STATS_FILE': os.path.join(BASE_DIR, 'static', 'dist', 'webpack-stats.json')
    }
}

# prod_settings.py
# ================

from django.http import UnreadablePostError

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
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'include_html': True,
            'filters': ['require_debug_false', 'skip_unreadable_posts'],
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins', 'console'],
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

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.PyLibMCCache',
        'LOCATION': env('MEMCACHED_HOST', 'localhost') + ':11211',
    }
}


# ansible settings template
# =========================

DEFAULT_FROM_EMAIL = SERVER_EMAIL = "Unhangout Team <noreply@{{ django_domain }}>"
ADMINS = MANAGERS = [("Charlie DeTar", "cfd@media.mit.edu")]


ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'
# Add client id's and secrets for social account providers. Changes only take
# effect when you sync them to the database with `./manage.py sync_auth_providers`.
ALLAUTH_APP_KEYS['twitter']['client_id'] = env('TWITTER_CLIENT_ID', '')
ALLAUTH_APP_KEYS['twitter']['secret'] = env('TWITTER_SECRET', '')
ALLAUTH_APP_KEYS['facebook']['client_id'] = env('FACEBOOK_CLIENT_ID', '')
ALLAUTH_APP_KEYS['facebook']['secret'] = env('FACEBOOK_SECRET', '')
ALLAUTH_APP_KEYS['google']['client_id'] = env('GOOGLE_CLIENT_ID', '')
ALLAUTH_APP_KEYS['google']['secret'] = env('GOOGLE_SECRET', '')

# Add INSTALLED_APPS for any in-use social account providers.
for name, keys in ALLAUTH_APP_KEYS.items():
    if keys['client_id']:
        INSTALLED_APPS.append('allauth.socialaccount.providers.%s' % name)
