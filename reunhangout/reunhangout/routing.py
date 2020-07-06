from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter

import plenaries.routing
import breakouts.routing

application = ProtocolTypeRouter({
    'websocket': AuthMiddlewareStack(
        URLRouter(
            plenaries.routing.websocket_urlpatterns
            + breakouts.routing.websocket_urlpatterns
        )
    ),
});
