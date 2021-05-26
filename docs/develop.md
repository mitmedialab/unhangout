---
layout: doc
---

# Developing unhangout

Unhangout is built using Django for backend logic and React on the frontend.


## Directory overview

- `./reunhangout/` - the application code for the Django server and React frontend
- `./ansible/` - code for deploying Unhangout
- `./docs/` - this documentation you're reading

## Django app

The django app is structured as several somewhat separate 'Django apps', the most important being `plenaries` and `breakouts`.

- plenaries - this is to code relating to an event on unhangout. Users can chat, watch videos and suggest/add/join breakouts
- breakouts - this is to code for breakouts - users interact in the breakout via Jitsi and a shared Etherpad.

Some of the other apps include
- accounts - account creation logic
- analytics - some analytics about events
- frontend - some frontend support functions
- richtext - a custom db field for rich text
- videosync - logic for synchronizing videos between multiple watchers

The React application for the frontend resides in the static folder. `./reunhangout/static/js` contains the logic while `./reunhangouts/static/scss` contains the styleheets.




