FROM node:carbon-alpine AS frontend
WORKDIR /opt/app/
COPY reunhangout/package.json /opt/app/
RUN apk --no-cache add --virtual native-deps \
  g++ make python && \
  npm install --quiet --production && \
  apk del native-deps
COPY reunhangout/ /opt/app/
RUN npm run build:prod

FROM debian:buster-slim
WORKDIR /opt/app
RUN mkdir -p /var/lib/celery && \
    addgroup --gid 5313 celery && \
    adduser --uid 5313 --gid 5313 celery && \
    chown celery:celery /var/lib/celery/
RUN apt-get update \
    && apt-get install -y \
        build-essential \
        libjpeg-dev \
        libmemcached-dev \
        libpq-dev \
        nodejs \
        npm \
        python3-dev \
        python3-venv \
        redis \
        virtualenv \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*
RUN npm i mjml
COPY requirements.txt /opt/app/
RUN python3 -m venv /opt/app-venv/ \
    && /opt/app-venv/bin/pip install -r requirements.txt
COPY reunhangout/ /opt/app
COPY --from=frontend /opt/app/static/dist static/dist
# TODO
RUN cp reunhangout/default_settings.py reunhangout/settings.py
COPY docker/entry.sh /entry.sh
EXPOSE 80
ENTRYPOINT ["/entry.sh"]
CMD ["/opt/app-venv/bin/daphne", "reunhangout.asgi:application", "-b", "0.0.0.0", "-p", "80", "--proxy-headers"]
