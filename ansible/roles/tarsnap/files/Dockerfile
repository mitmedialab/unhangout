#FROM debian:stretch-slim
FROM postgres:11
WORKDIR /opt/app
RUN apt-get update \
    && apt-get install --no-install-recommends -y \
        curl \
        ca-certificates \
        gnupg \
        python3 \
    && rm -rf /var/lib/apt/lists/*
RUN \
    curl -s https://pkg.tarsnap.com/tarsnap-deb-packaging-key.asc | apt-key add - \
    && echo "deb http://pkg.tarsnap.com/deb/stretch ./" | tee -a /etc/apt/sources.list.d/tarsnap.list \
    && apt-get update \
    && apt-get install -y tarsnap
COPY tarsnap.py tarsnap.py
CMD ["/usr/bin/python3", "tarsnap.py"]
