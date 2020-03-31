#!/bin/sh
set -e

if [ "$1" = '/opt/app-venv/bin/python' ]; then
    /opt/app-venv/bin/python /opt/app/manage.py migrate --noinput
    /opt/app-venv/bin/python /opt/app/manage.py collectstatic --noinput
    exec "$@"
fi

exec "$@"
