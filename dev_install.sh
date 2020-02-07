#!/bin/bash

PROJECT_NAME=reunhangout

set -e

if ! which python3 > /dev/null 2>&1; then
    echo "Please install python3 first."
    exit 1
fi
if ! which virtualenv > /dev/null 2>&1; then
    echo "Please install virtualenv."
    exit 1
fi

if ! which node > /dev/null 2>&1; then
    echo "Please install nodejs version 5 or higher."
    exit 1
fi
NODE_VERSION=`node --version`
if ! [[ $NODE_VERSION =~ ^v([0-9]+)\.[0-9]+\.[0-9]+$ ]]; then
    echo "Please install nodejs version 5 or higher.  $NODE_VERSION installed."
    exit 1
elif [[ ${BASH_REMATCH[1]} -lt 5 ]]; then
    echo "Please install nodejs version 5 or higher.  $NODE_VERSION installed."
    exit 1
fi
if ! which yarn > /dev/null 2>&1; then
    echo "Please install yarn."
    exit 1
fi


DIR=$(cd -P -- "$(dirname -- "$0")" && pwd -P)
VENV=$DIR/venv
if [ ! -d "$VENV" ]; then
    virtualenv --no-site-packages --python "`which python3`" $VENV
fi

$VENV/bin/pip install -r $DIR/shrinkwrap.txt
cd "$DIR/$PROJECT_NAME"
yarn install
yarn run build:dev

if [ ! -e "$DIR/$PROJECT_NAME/$PROJECT_NAME/settings.py" ]; then
    cp "$DIR/$PROJECT_NAME/$PROJECT_NAME/example.settings.py" "$DIR/$PROJECT_NAME/$PROJECT_NAME/settings.py"
fi

$VENV/bin/python "$DIR/$PROJECT_NAME/manage.py" migrate

echo 'Install successful!'
