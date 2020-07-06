import pytest

from django.utils import timezone

from plenaries.models import Plenary

import datetime

@pytest.fixture
def user_with_plenary(transactional_db, django_user_model):
    u1 = django_user_model.objects.create_user(
            username='u1',
            display_name='User Oneypants',
            email='u1@example.com',
            receive_wrapup_emails=True)
    start = timezone.now().replace(2020, 3, 20, 12, 0, 0)
    plenary = Plenary.objects.create(
        name='Test Plenary',
        slug='test-plenary',
        organizer='Teh Organizers',
        doors_open=start - datetime.timedelta(minutes=30),
        start_date=start,
        end_date=start + datetime.timedelta(minutes=90),
        doors_close=start + datetime.timedelta(minutes=150),
    )
    plenary.save()
    plenary.admins.add(u1)
    return u1, plenary


@pytest.fixture
def rand_user(django_user_model):
    import random, string
    name = ''.join([random.choice(string.ascii_letters) for _ in range(15)])
    user = django_user_model.objects.create_user(
        username=name,
        display_name=name,
        email=f'{name}@example.com',
        receive_wrapup_emails=True
    )
    return user
