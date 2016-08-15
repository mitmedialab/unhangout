from .prod_settings import *

ALLOWED_HOSTS = ['{{ django_domain }}']

DEFAULT_FROM_EMAIL = SERVER_EMAIL = "noreply@{{ django_domain }}"
ADMINS = MANAGERS = [("Charlie DeTar", "cfd@media.mit.edu")]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': '{{ django_postgres_db }}',
        'USER': '{{ django_postgres_user }}',
        'PASSWORD': '{{ django_postgres_password }}'
    }
}
