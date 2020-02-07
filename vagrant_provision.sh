#!/bin/bash

## NOTE: written for ubuntu/bionic64 virtualbox

# set up yarn apt repo
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list

# install packages
sudo apt update
sudo apt install -y \
    build-essential \
    libjpeg-dev \
    libmemcached-dev \
    nodejs \
    python3-virtualenv \
    python3-dev \
    redis \
    virtualenv \
    yarn \
    zlib1g-dev
