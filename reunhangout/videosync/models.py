from django.db import models
from django.utils.timezone import now

from channels import Group
from reunhangout.utils import json_dumps

class VideoSyncManager(models.Manager):
    def start(self, sync_id, channel_group_name, time_index=0):
        try:
            vs = self.get(sync_id=sync_id)
        except VideoSync.DoesNotExist:
            vs = VideoSync(sync_id=sync_id)

        vs.channel_group_name = channel_group_name
        vs.start_time_clock = now()
        vs.start_time_index = time_index
        vs.save()

    def stop(self, sync_id):
        try:
            vs = self.get(sync_id=sync_id)
        except VideoSync.DoesNotExist:
            pass
        else:
            vs.delete()

    def tick(self):
        for vs in self.all():
            vs.tick()

class VideoSync(models.Model):
    sync_id = models.CharField(max_length=255, unique=True,
            help_text="Unique name for the video container we are syncing")
    channel_group_name = models.CharField(max_length=255,
            help_text="Name of the channel group to broadcast to")
    start_time_clock = models.DateTimeField()
    start_time_index = models.IntegerField()
    current_time_index = models.IntegerField(default=0)

    objects = VideoSyncManager()

    def __str__(self):
        return self.sync_id

    def serialize(self):
        return {
            'sync_id': self.sync_id,
            'start_time_clock': self.start_time_clock,
            'start_time_index': self.start_time_index,
            'current_time_index': self.current_time_index,
            'state': 'playing',
        }

    def broadcast(self):
        Group(self.channel_group_name).send({
            'text': json_dumps({
                'type': 'videosync',
                'payload': self.serialize()
            })
        })

    def broadcast_pause(self):
        Group(self.channel_group_name).send({
            'text': json_dumps({
                'type': 'videosync',
                'payload': {
                    'sync_id': self.sync_id,
                    'state': 'paused'
                }
            })
        })

    def tick(self):
        n = now()
        elapsed = int((n - self.start_time_clock).total_seconds())
        time_index = self.start_time_index + elapsed
        if self.current_time_index != time_index:
            self.current_time_index = time_index
            self.save()
