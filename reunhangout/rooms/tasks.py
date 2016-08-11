from celery import shared_task

from rooms.models import Room

@shared_task(name='rooms.tasks.prune_connections')
def prune_connections():
    Room.objects.prune_connections()

@shared_task(name='rooms.tasks.prune_rooms')
def prune_rooms():
    Room.objects.prune_rooms()
