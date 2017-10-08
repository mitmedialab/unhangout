from contextlib import contextmanager
import datetime
import pytest
import pytz

from django.conf import settings
from django.core import mail as django_mail

from plenaries.models import Plenary
from plenaries import tasks
from breakouts.models import Breakout
from accounts.models import User
from analytics.models import Action

def dt(*args):
    naive = datetime.datetime(*args)
    return pytz.timezone(settings.TIME_ZONE).localize(naive)

@contextmanager
def monkeypatch(monkey_cls, attr, replacement):
    orig = getattr(monkey_cls, attr)
    setattr(monkey_cls, attr, replacement)
    yield 
    setattr(monkey_cls, attr, orig)

@pytest.fixture
def attended_plenary():
    plenary = Plenary(
        name='Test Plenary',
        slug='testy019328741074',
        organizer='Teh Organizers',
        doors_open=dt( 2017,9,28,11,30,0),
        start_date=dt( 2017,9,28,12,0 ,0),
        end_date=dt(   2017,9,28,14,0 ,0),
        doors_close=dt(2017,9,28,14,30,0),
    )
    plenary.full_clean()
    plenary.save()
    with monkeypatch(Breakout, 'create_etherpad', lambda self: None):
        b1 = plenary.breakout_set.create(title='One', slug='one')
        b2 = plenary.breakout_set.create(title='Two', slug='two')
        b3 = plenary.breakout_set.create(title='Three', slug='three')

    u1 = User.objects.create(username='u1', display_name='User Oneypants',
            email='u1@example.com',
            receive_wrapup_emails=True,
            contact_card_twitter='user1')
    u2 = User.objects.create(username='u2', display_name='Sally McUser2',
            email='u2@example.com',
            receive_wrapup_emails=True,
            contact_card_twitter='user2')
    u3 = User.objects.create(username='u3', display_name='James Robins',
            email='u3@example.com',
            receive_wrapup_emails=True,
            contact_card_email='user3@example.com')
    u4 = User.objects.create(username='u4',
            email='u4@example.com',
            receive_wrapup_emails=True,
            display_name='Alexander Supertramp')
    u5 = User.objects.create(username='u5',
            email='u5@example.com')

    def log(breakout, user, action, minutes):
        Action.objects.create(
            plenary=plenary,
            breakout=breakout,
            user=user,
            action=action,
            timestamp=dt(2017,9,28,12,minutes,0),
        )

    # u1 and u2 concurrent in b1
    log(b1, u1, "join_breakout",  5 )
    log(b1, u1, "leave_breakout", 15)
    log(b1, u2, "join_breakout",  10)
    log(b1, u2, "leave_breakout", 16)
    # u4 missing "join", so shouldn't show concurrent.
    log(b1, u4, "leave_breakout", 15)


    # u1 and u3 not concurrent in b1
    log(b1, u1, "join_breakout",  25)
    log(b1, u1, "leave_breakout", 30)
    log(b1, u3, "join_breakout",  31)
    log(b1, u3, "leave_breakout", 40)
    log(b1, u4, "join_breakout",  39)
    log(b1, u4, "leave_breakout", 41)

    # u3 and u4 in b2 concurrently, but don't show overlap because u3 has a
    # second "join" without a leave that supercedes the first.
    log(b2, u3, "join_breakout",  10)
    log(b2, u3, "join_breakout",  15)
    log(b2, u3, "leave_breakout", 20)
    log(b2, u4, "join_breakout",  5)
    log(b2, u4, "leave_breakout", 14)
    # ... but u1 should show concurrency with u3.
    log(b2, u1, "join_breakout",  17)
    log(b2, u1, "leave_breakout", 23)

    # Everyone in b3 except u5.
    log(b3, u1, "join_breakout",  48)
    log(b3, u1, "leave_breakout", 50)
    log(b3, u2, "join_breakout",  50)
    log(b3, u2, "leave_breakout", 52)
    log(b3, u3, "join_breakout",  49)
    log(b3, u3, "leave_breakout", 53)
    log(b3, u4, "join_breakout",  50)
    log(b3, u4, "leave_breakout", 54)

    # u5 all alone.
    log(b1, u5, "join_breakout",  0)
    log(b1, u5, "leave_breakout", 4)

    return plenary, b1, b2, b3, u1, u2, u3, u4, u5

@pytest.fixture
def mail():
    django_mail.outbox = []
    return django_mail
    
#
# Tests
#

@pytest.mark.django_db
def test_breakout_copresence(attended_plenary):
    plenary, b1, b2, b3, u1, u2, u3, u4, u5 = attended_plenary

    copresence = Action.objects.breakout_copresence(plenary)

    def prettify(copresence):
        # Map numerical ids to readable identifiers for easier debugging.
        u_map = {u1.id: "u1", u2.id: "u2", u3.id: "u3", u4.id: "u4", u5.id: "u5"}
        b_map = {b1.id: "b1", b2.id: "b2", b3.id: "b3"}
        out = {}
        for user_id, breakout_dict in copresence.items():
            out[u_map[user_id]] = {}
            for breakout_id, user_set in breakout_dict.items():
                out[u_map[user_id]][b_map[breakout_id]] = set(
                    [u_map[u] for u in user_set]
                )
        return out


    assert prettify(copresence) == {
        'u1': {
            'b1': {'u2'},
            'b2': {'u3'},
            'b3': {'u2', 'u3', 'u4'},
        },
        'u2': {
            'b1': {'u1'},
            'b3': {'u1', 'u3', 'u4'},
        },
        'u3': {
            'b1': {'u4'},
            'b2': {'u1'},
            'b3': {'u1', 'u2', 'u4'},
        },
        'u4': {
            'b1': {'u3'},
            'b3': {'u1', 'u2', 'u3'},
        },
    }

@pytest.mark.django_db
def test_wrapup_email(attended_plenary, mail):
    with monkeypatch(Breakout, 'get_etherpad_readonly',
            lambda self: 'https://...'):
        plenary, b1, b2, b3, u1, u2, u3, u4, u5 = attended_plenary
        u6 = User.objects.create(username='u6') # not attended
        assert len(mail.outbox) == 0
        tasks.wrapup_emails([plenary.id])

        assert len(mail.outbox) == 4
        assert set([m.subject for m in mail.outbox]) == set([
            'Continue the conversation from Unhangout: Test Plenary'
        ])
        assert set([m.to[0] for m in mail.outbox]) == set([
            u1.email, u2.email, u3.email, u4.email
        ])
        mail.outbox = []
        tasks.wrapup_emails([plenary.id])
        assert len(mail.outbox) == 0

