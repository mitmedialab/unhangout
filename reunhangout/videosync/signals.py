from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from reunhangout.utils import json_dumps
from videosync.models import VideoSync

@receiver(post_save, sender=VideoSync, dispatch_uid="broadcast_video_sync")
def broadcast_video_sync(sender, instance, created, raw, using, update_fields, **kwargs):
    instance.broadcast()

@receiver(pre_delete, sender=VideoSync, dispatch_uid="broadcast_video_stop")
def broadcast_video_stop(sender, instance, using, **kwargs):
    instance.broadcast_pause()
