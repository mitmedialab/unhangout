from channels.routing import route

channel_routing = [
    # Room membership management
    route("websocket.connect", "rooms.channels.ws_connect",
        path=r'^/(?:event|breakout)/'),
    route("websocket.disconnect", "rooms.channels.ws_disconnect",
        path=r'^/(?:event|breakout)/'),

    # Messages
    route("websocket.receive", "plenaries.channels.ws_receive",
        path=r'^/event/(?P<slug>\w+)/$'),
    route("websocket.receive", "breakouts.channels.ws_receive",
        path=r'^/breakout/(?P<breakout_id>\d+)/$'),
]
