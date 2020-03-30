from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'breakout/(?P<breakout_id>[\w-]+)/', consumers.BreakoutConsumer),
]
