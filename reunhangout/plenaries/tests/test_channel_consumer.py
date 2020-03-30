import pytest
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from django.utils import timezone

from plenaries.routing import websocket_urlpatterns
from plenaries.models import Plenary

import datetime

User = get_user_model()

class TestAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner
        self.user = AnonymousUser()

    def __call__(self, scope):
        return self.inner(dict(scope, user=self.user))

    def login(self, user):
        self.user = user

    def logout(self, user):
        self.user = AnonymousUser()



@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_anonymous_connect():
    application = TestAuthMiddleware(URLRouter(websocket_urlpatterns))
    communicator = WebsocketCommunicator(application, "/event/test-hangout/")
    connected, subprotocol = await communicator.connect()
    assert connected
    # Test sending text
    await communicator.send_to(text_data="hello")
    response = await communicator.receive_json_from()
    assert response == {"error": "Plenary not found", "type": "error"}
    # Close
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_connect(django_user_model):
    u1 = django_user_model.objects.create_user(
            username='u1',
            display_name='User Oneypants',
            email='u1@example.com',
            receive_wrapup_emails=True)
    start = timezone.now().replace(2020, 3, 20, 12, 0, 0)
    plenary = Plenary.objects.create(
        name='Test Plenary',
        slug='testy019328741074',
        organizer='Teh Organizers',
        doors_open=start - datetime.timedelta(minutes=30),
        start_date=start,
        end_date=start + datetime.timedelta(minutes=90),
        doors_close=start + datetime.timedelta(minutes=150),
    )
    plenary.save()
    plenary.admins.add(u1)
    plenary.save()

    assert User.objects.get(username='u1').display_name == 'User Oneypants'

    application = TestAuthMiddleware(URLRouter(websocket_urlpatterns))
    application.login(u1)
    communicator = WebsocketCommunicator(application, "/event/testy019328741074/")
    connected, subprotocol = await communicator.connect()
    assert connected
    response = await communicator.receive_json_from()
    assert response.get('type') == 'presence'
    assert set(response.get('payload').keys()) == set(['channel_name', 'lurkers', 'members'])
    await communicator.disconnect()
