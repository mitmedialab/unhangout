#!/bin/sh
set -e

if [ "$1" = '/opt/app-venv/bin/gunicorn' ];
then
    dockerize -wait tcp://postgres:5432 # TODO
    /opt/app-venv/bin/python /opt/app/manage.py migrate --noinput
    /opt/app-venv/bin/python /opt/app/manage.py sync_auth_providers
    /opt/app-venv/bin/python /opt/app/manage.py collectstatic --noinput
    PROXY_IP=`getent hosts nginx-proxy | awk '{ print $1 ; exit}'`
    CMD="$@"
    if [ -n "$PROXY_IP" ];
    then
        CMD="$CMD --forwarded-allow-ips $PROXY_IP"
    fi
    exec $CMD
else
    exec "$@"
fi
