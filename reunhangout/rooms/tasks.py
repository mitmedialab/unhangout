from celery import shared_task

from rooms.models import Room

@shared_task(name='rooms.tasks.prune')
def prune():
    Room.objects.prune_all()
