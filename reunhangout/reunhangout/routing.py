from channels.routing import route

plenary_path = r'/event/(?P<slug>\w+)'
breakout_path = r'/breakout/(?P<breakout_id>\w+)'

channel_routing = [
    # Plenaries
    route("websocket.connect", "plenaries.channels.ws_connect", path=plenary_path),
    route("websocket.disconnect", "plenaries.channels.ws_disconnect", path=plenary_path),
    route("websocket.receive", "plenaries.channels.ws_receive", path=plenary_path),

    # Messages
    route("websocket.connect", "breakouts.channels.ws_connect", path=breakout_path),
    route("websocket.disconnect", "breakouts.channels.ws_disconnect", path=breakout_path),
    route("websocket.receive", "breakouts.channels.ws_receive", path=breakout_path),

    # Default route
    route("websocket.connect", lambda m: None),
    route("websocket.receive", lambda m: None),
    route("websocket.disconnect", lambda m: None),
]
