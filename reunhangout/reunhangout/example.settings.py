from .dev_settings import *

# To use Django Debug Toolbar, uncomment this:
#INSTALLED_APPS += ['debug_toolbar']

# Instructions for obtaining the youtube api key:
# https://developers.google.com/youtube/v3/getting-started
# Enable "YouTube Data API v3".
PUBLIC_API_KEYS['youtube'] = 'change-this-in-settings.py'
