import json
from datetime import timedelta

from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.timezone import now

from channels import Group

class ConnectionManager(models.Manager):
    def touch(self, channel_name):
        self.filter(channel_name=channel_name).update(last_seen=now())

    def leave_all(self, channel_name):
        for conn in self.select_related('room').filter(
                channel_name=channel_name):
            room = conn.room
            conn.delete()
            room.broadcast_presence()

class Connection(models.Model):
    room = models.ForeignKey('Room', on_delete=models.CASCADE)
    channel_name = models.CharField(max_length=255)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True)
    last_seen = models.DateTimeField(default=now)

    objects = ConnectionManager()

    def __str__(self):
        return self.channel_name

    class Meta:
        unique_together = [('room', 'channel_name')]

class RoomManager(models.Manager):
    def add(self, room_channel_name, user_channel_name, user=None):
        room, created = Room.objects.get_or_create(channel_name=room_channel_name)
        room.add_connection(user_channel_name, user)
        return room

    def prune_connections(self, channel_layer=None, age=60):
        for room in Room.objects.all():
            room.prune_connections(age)

    def prune_rooms(self):
        Room.objects.filter(connection__isnull=True).delete()

class Room(models.Model):
    channel_name = models.CharField(max_length=255, unique=True)

    objects = RoomManager()

    def __str__(self):
        return self.channel_name

    def add_connection(self, channel_name, user=None):
        conn, created = Connection.objects.get_or_create(
            room=self,
            channel_name=channel_name,
            user=user if (user and user.is_authenticated()) else None
        )
        if created:
            self.broadcast_presence()

    def prune_connections(self, age_in_seconds):
        num_deleted, num_per_type = Connection.objects.filter(
            room=self,
            last_seen__lt=now() - timedelta(seconds=age_in_seconds)
        ).delete()
        if num_deleted > 0:
            self.broadcast_presence()

    def serialize(self):
        User = get_user_model()
        members = User.objects.filter(connection__room=self).distinct()
        return {
            'channel_name': self.channel_name,
            'members': [m.serialize_public() for m in members],
            'lurkers': self.connection_set.filter(user=None).count(),
        }

    def broadcast_presence(self):
        Group(self.channel_name).send({
            'text': json.dumps({
                'type': 'present',
                'payload': self.serialize()
            })
        })

    @classmethod
    def over_capacity_error(cls, message, path):
        return cls._join_error(message, path, "over-capacity", "Over capacity")

    @classmethod
    def already_connected_error(cls, message, path):
        return cls._join_error(message, path, "already-connected", "Already connected")

    @classmethod
    def _join_error(cls, message, channel_name, error_code, error_msg):
        message.reply_channel.send({
            'text': json.dumps({
                'type': 'present',
                'payload': {
                    "channel_name": channel_name,
                    "members": [],
                    "error": error_msg,
                    "error_code": error_code,
                }
            })
        })


