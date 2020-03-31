FROM ubuntu:18.04
WORKDIR /opt/app

# TODO
# curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
# echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list

RUN apt-get update \
    && apt-get install -y \
        build-essential \
        libjpeg-dev \
        libmemcached-dev \
        nodejs \
        python3-dev \
        python3-venv \
        redis \
        virtualenv \
        yarn \
        zlib1g-dev

#   virtualenv --no-site-packages --python "`which python3`" $VENV
COPY shrinkwrap.txt /opt/app/
RUN python3 -m venv /opt/app-venv/ \
    && /opt/app-venv/bin/pip install -r shrinkwrap.txt

#   yarn install
#   yarn run build:dev

#   cp "$DIR/$PROJECT_NAME/$PROJECT_NAME/example.settings.py" "$DIR/$PROJECT_NAME/$PROJECT_NAME/settings.py"

COPY . /opt/app
ENTRYPOINT opt/app/docker/entry.sh
CMD /opt/app-venv/bin/python manage.py runserver
