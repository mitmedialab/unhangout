from celery import shared_task

from videosync.models import VideoSync

@shared_task(name='videosync.tasks.tick')
def tick():
    VideoSync.objects.tick()
