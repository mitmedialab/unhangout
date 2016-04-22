from channels.routing import route

channel_routing = [
    route("websocket.receive", "plenaries.channels.ws_receive"),
    route("websocket.connect", "plenaries.channels.ws_connect"),
    route("websocket.connect", "plenaries.channels.ws_disconnect"),
]
