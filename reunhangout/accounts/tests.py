import hashlib
import hmac
import pytest
import time

from django.test import TestCase
from django.test import Client
from django.core import mail
from django.conf import settings

from accounts.models import EmailNotification, User
from plenaries.models import Plenary
from plenaries.tests import dt


class TestAccountViews(TestCase):

    def setUp(self):
        pass

    def test_registration(self):
        c = Client()
        data = {
            "username": "user",
            "email": "ThIsNoTaGoOd@EmAil.CoM",
            "password1": "password",
            "password2": "password",
        }
        resp = c.post('/accounts/signup/', data)
        self.assertRedirects(resp, '/events/')
        users = User.objects.filter(username__iexact='user')
        self.assertEqual(users.count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Please Confirm Your E-mail Address', mail.outbox[0].subject)


@pytest.mark.django_db
def test_mailgun_webhooks(client):
    user = User.objects.create(username='test', email='test@example.com')

    res = client.get("/accounts/mailgun")
    assert res.status_code == 400

    res = client.post("/accounts/mailgun")
    assert res.status_code == 400

    token = 'asdf'
    timestamp = int(time.time())
    signature = str(hmac.new(
        key=settings.MAILGUN_ACTIVE_API_KEY.encode('utf-8'),
        msg='{}{}'.format(timestamp, token).encode('utf-8'),
        digestmod=hashlib.sha256).hexdigest())
    creds = {'signature': signature, 'timestamp': timestamp, 'token': token}
    def add_creds(**kwargs):
        data = {}
        data.update(creds)
        data.update(kwargs)
        return data

    res = client.post("/accounts/mailgun", creds)
    assert res.status_code == 406 # missing email notification id


    en = EmailNotification.objects.wrapup_email(
        user,
        plenary=Plenary.objects.create(
            name='Test Plenary',
            doors_open=dt( 2017,10,2,11,0,0),
            start_date=dt( 2017,10,2,12,0,0),
            end_date=dt(   2017,10,2,14,0,0),
            doors_close=dt(2017,10,2,15,0,0),
        ),
        silent=False,
    )

    res = client.post("/accounts/mailgun", add_creds(email_notification_id=en.id))
    assert res.status_code == 200

    ua_params = {
        'country': "USA",
        'user-agent': 'Secret Agent',
        'region': "Regional!",
        'city': "Anytown",
        'device-type': "New hotness",
        'client-name': 'Devicey McDevice',
        'client-os': 'All your OS',
    }

    # Click webhook
    res = client.post("/accounts/mailgun", add_creds(
        email_notification_id=en.id,
        event="opened",
        **ua_params
    ))
    assert res.status_code == 200
    en = EmailNotification.objects.get(pk=en.id)
    assert en.sent == True
    assert en.delivered == True
    assert en.opens == [dict(timestamp=str(creds['timestamp']), **ua_params)]

    # Open webhook
    res = client.post("/accounts/mailgun", add_creds(
        email_notification_id=en.id,
        event="clicked",
        url="https://www.example.com/fun",
        **ua_params,
    ))
    assert res.status_code == 200
    en = EmailNotification.objects.get(pk=en.id)
    assert en.sent == True
    assert en.delivered == True
    assert en.clicks == [dict(
        timestamp=str(creds['timestamp']),
        url="https://www.example.com/fun",
        **ua_params,
    )]

    # Failure webhook
    res = client.post("/accounts/mailgun", add_creds(
        email_notification_id=en.id,
        event="dropped",
        reason="Like it's hot",
        code="hot",
        description="Some times",
    ))
    assert res.status_code == 200
    en = EmailNotification.objects.get(pk=en.id)
    assert en.sent == True
    assert en.delivered == False
    assert en.failures == [dict(
        event='dropped',
        timestamp=str(creds['timestamp']),
        reason="Like it's hot",
        code="hot",
        description="Some times",
    )]

    # Bounced webhook
    res = client.post("/accounts/mailgun", add_creds(
        email_notification_id=en.id,
        event="bounced",
        code="nexistpas",
        error="Il n'exists pas",
        notification="Something",
    ))
    assert res.status_code == 200
    en = EmailNotification.objects.get(pk=en.id)
    assert en.sent == True
    assert en.delivered == False
    assert en.failures == [dict(
        event='dropped',
        reason="Like it's hot",
        code="hot",
        description="Some times",
        timestamp=str(creds['timestamp']),
    ), dict(
        event="bounced",
        code="nexistpas",
        error="Il n'exists pas",
        notification="Something",
        timestamp=str(creds['timestamp']),
    )]

    # Delivered webhook
    res = client.post("/accounts/mailgun", add_creds(
        email_notification_id=en.id,
        event="delivered",
    ))
    assert res.status_code == 200
    en = EmailNotification.objects.get(pk=en.id)
    assert en.sent == True
    assert en.delivered == True
    assert en.deliveries == [dict(
        timestamp=str(creds['timestamp']),
    )]

