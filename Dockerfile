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
    && apt-get install --no-install-recommends -y \
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
        wget \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*
RUN npm i mjml@^3.3.5
COPY shrinkwrap.txt /opt/app/
RUN python3 -m venv /opt/app-venv/ \
    && /opt/app-venv/bin/pip --no-cache-dir install -r shrinkwrap.txt
COPY reunhangout/ /opt/app
COPY --from=frontend /opt/app/static/dist static/dist
ENV DOCKERIZE_VERSION v0.6.1
RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && tar -C /usr/local/bin -xzvf dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && rm dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz
COPY docker/entry.sh /entry.sh
EXPOSE 80
ENTRYPOINT ["/entry.sh"]
CMD ["/opt/app-venv/bin/gunicorn", "reunhangout.asgi:application", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:80", "--forwarded-allow-ips=\"*\""]
