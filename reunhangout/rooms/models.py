import json

from django.db import models
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model

from channels import channel_layers, Group

class Connection(models.Model):
    room = models.ForeignKey('Room')
    channel_name = models.CharField(max_length=255, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True)

class RoomManager(models.Manager):
    def add(self, path, user, channel_name):
        room, created = Room.objects.get_or_create(path=path)
        room.add_connection(user, channel_name)
        return room

    def remove(self, path, user, channel_name):
        try:
            room = Room.objects.get(path=path)
        except Room.DoesNotExist:
            return None
        room.remove_connection(channel_name)
        return room

    def prune(self, path, channel_names):
        try:
            room = Room.objects.get(path=path)
        except Room.DoesNotExist:
            return None
        room.prune_connections(keep_channels=channel_names)
        return room

    def prune_all(self, channel_layer=None):
        channel_layer = channel_layer or channel_layers['default']
        for room in Room.objects.all():
            channel_names = channel_layers['default'].group_channels(room.path)
            if len(channel_names) == 0:
                room.delete()
            else:
                room.prune_connections(channel_names)

class Room(models.Model):
    path = models.CharField(max_length=255, unique=True)

    objects = RoomManager()

    def __str__(self):
        return self.path

    def remove_connection(self, channel_name):
        self.connection_set.filter(channel_name=channel_name).delete()

    def add_connection(self, user, channel_name):
        self.connection_set.add(Connection.objects.get_or_create(
            room=self,
            channel_name=channel_name,
            user=None if isinstance(user, AnonymousUser) else user
        )[0])

    def prune_connections(self, keep_channels):
        print(self.path, keep_channels)
        Connection.objects.filter(room=self).exclude(
            channel_name__in=keep_channels
        ).delete()
        self.broadcast_presence()

    def serialize(self):
        User = get_user_model()
        members = User.objects.filter(connection__room=self).distinct()
        return {
            'path': self.path,
            'members': [m.serialize_public() for m in members],
            'lurkers': self.connection_set.filter(user=None).count(),
        }

    def broadcast_presence(self):
        Group(self.path).send({
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
    def _join_error(cls, message, path, error_code, error_msg):
        message.reply_channel.send({
            'text': json.dumps({
                'type': 'present',
                'payload': {
                    "path": path,
                    "members": [],
                    "error": error_msg,
                    "error_code": error_code,
                }
            })
        })


