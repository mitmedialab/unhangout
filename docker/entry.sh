#!/bin/sh
set -e

if [ "$1" = '/opt/app-venv/bin/daphne' ]; then
    /opt/app-venv/bin/python /opt/app/manage.py migrate --noinput
    /opt/app-venv/bin/python /opt/app/manage.py sync_auth_providers --noinput
    /opt/app-venv/bin/python /opt/app/manage.py collectstatic --noinput
    exec "$@"
fi

if [ "$1" = '/opt/app-venv/bin/celery' ]; then
    chown -R celery:celery /var/lib/celery
fi

exec "$@"
