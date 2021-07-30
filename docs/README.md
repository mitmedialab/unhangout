# Project documentation

This project contains the landing site for unhangout.media.mit.edu + the documentation.

It's configured as a Jekyll site that will be built by GitHub Pages.

To run it locally using docker execute:
    mkdir .bundler
    chown 1000:1000 .bundler
    docker run -i -t --rm -u 1000:1000 -p 4000:4000 -v `pwd`:/opt/app -v `pwd`/.bundler/:/opt/bundler -e BUNDLE_PATH=~/opt/bundler -w /opt/app ruby:2.7 bash -c "bundle install && bundle exec jekyll serve --trace --watch -H 0.0.0.0"
