import pytest
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter

from django.contrib.auth import get_user_model
from django.db import close_old_connections
from django.utils import timezone

from plenaries.routing import websocket_urlpatterns
from plenaries.models import Plenary

import datetime
from .fixtures import *
from .utils import *

User = get_user_model()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_plenary_404(user_with_plenary):
    user, plenary = user_with_plenary
    application = TestAuthMiddleware(URLRouter(websocket_urlpatterns))
    communicator = WebsocketCommunicator(application, "/event/non-existent-plenary/")
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
async def test_connect(user_with_plenary):
    user, plenary = user_with_plenary
    assert User.objects.get(username='u1').display_name == 'User Oneypants'

    application = TestAuthMiddleware(URLRouter(websocket_urlpatterns))
    application.login(user)
    communicator = WebsocketCommunicator(application, "/event/test-plenary/")
    connected, subprotocol = await communicator.connect()
    assert connected
    response = await communicator.receive_json_from()
    assert response.get('type') == 'presence'
    assert set(response.get('payload').keys()) == set(['channel_name', 'lurkers', 'members'])
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_connect_TODO(django_user_model):
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


@pytest.fixture
async def admin_connected(user_with_plenary):
    user, plenary = user_with_plenary
    application = TestAuthMiddleware(URLRouter(websocket_urlpatterns))
    application.login(user)
    communicator = WebsocketCommunicator(application, "/event/test-plenary/")
    connected, subprotocol = await communicator.connect()
    yield communicator
    await communicator.disconnect()


class TestTwoUsers():
    @pytest.mark.django_db(transaction=True)
    @pytest.mark.asyncio
    async def test_presence(self, user_with_plenary, rand_user):
        user, plenary = user_with_plenary
        application = TestAuthMiddleware(URLRouter(websocket_urlpatterns))
        application.login(user)
        communicator = WebsocketCommunicator(application, "/event/test-plenary/")
        connected, subprotocol = await communicator.connect()
        response = await communicator.receive_json_from()
        assert response.get('type') == 'presence'
        assert set(response.get('payload').keys()) == set(['channel_name', 'lurkers', 'members'])

        user2 = rand_user
        application2 = TestAuthMiddleware(URLRouter(websocket_urlpatterns))
        application2.login(rand_user)
        communicator2 = WebsocketCommunicator(application2, "/event/test-plenary/")
        connected, subprotocol = await communicator2.connect()
        response = await communicator2.receive_json_from()
        assert response.get('type') == 'presence'
        assert set(response.get('payload').keys()) == set(['channel_name', 'lurkers', 'members'])
        assert len(response.get('payload').get('members')) == 2
        assert response.get('payload',{}).get('members')[0].get('username') == user.username
        assert response.get('payload',{}).get('members')[1].get('username') == user2.username

        await communicator.disconnect()
        await communicator2.disconnect()


class TestAdminFunctions():

    @pytest.mark.django_db(transaction=True)
    @pytest.mark.asyncio
    async def test_admin_features(self, user_with_plenary):
        user, plenary = user_with_plenary
        application = TestAuthMiddleware(URLRouter(websocket_urlpatterns))
        application.login(user)
        communicator = WebsocketCommunicator(application, "/event/test-plenary/")
        connected, subprotocol = await communicator.connect()
        response = await communicator.receive_json_from()
        assert response.get('type') == 'presence'
        assert set(response.get('payload').keys()) == set(['channel_name', 'lurkers', 'members'])

        # TODO
        # - add embed
        # - create breakout
        # - set breakout state
        # - open breakouts
        # - send message to breakouts

        # Update plenary
        await communicator.send_json_to({"type": "plenary", "payload": {
            "name": "New name of plenary"
        }})
        response = await communicator.receive_json_from()
        assert response.get('type') == 'plenary'
        PLENARY_KEYS = (
            'random_max_attendees', 'breakout_mode', 'name', 'organizer', 'start_date',
            'end_date', 'doors_open', 'doors_close', 'breakouts_open', 'canceled',
            'slug', 'public', 'jitsi_server', 'wrapup_emails', 'etherpad_initial_text'
        )
        keys = set(response.get('payload').get('plenary').keys()) & set(PLENARY_KEYS)
        assert keys == set(PLENARY_KEYS)
        assert Plenary.objects.last().name == 'New name of plenary'

        await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_admin_features_2(admin_connected):
    communicator = admin_connected
    response = await communicator.receive_json_from()
    assert response.get('type') == 'presence'
    assert set(response.get('payload').keys()) == set(['channel_name', 'lurkers', 'members'])

    # Update plenary
    await communicator.send_json_to({"type": "plenary", "payload": {
        "name": "New name of plenary"
    }})
    response = await communicator.receive_json_from()
    assert response.get('type') == 'plenary'
    PLENARY_KEYS = (
        'random_max_attendees', 'breakout_mode', 'name', 'organizer', 'start_date',
        'end_date', 'doors_open', 'doors_close', 'breakouts_open', 'canceled',
        'slug', 'public', 'jitsi_server', 'wrapup_emails', 'etherpad_initial_text'
    )
    keys = set(response.get('payload').get('plenary').keys()) & set(PLENARY_KEYS)
    assert keys == set(PLENARY_KEYS)
    assert Plenary.objects.last().name == 'New name of plenary'

