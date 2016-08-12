from channels.routing import route

plenary_path = r'/event/(?P<slug>\w+)'
breakout_path = r'/breakout/(?P<breakout_id>\w+)'

channel_routing = [
    # Plenaries
    route("websocket.connect", "plenaries.channels.ws_connect", path=plenary_path),
    route("websocket.disconnect", "channels_presence.channels.ws_disconnect", path=plenary_path),
    route("websocket.receive", "plenaries.channels.ws_receive", path=plenary_path),

    # Messages
    route("websocket.connect", "breakouts.channels.ws_connect", path=breakout_path),
    route("websocket.disconnect", "channels_presence.channels.ws_disconnect", path=breakout_path),
    route("websocket.receive", "breakouts.channels.ws_receive", path=breakout_path),
]
