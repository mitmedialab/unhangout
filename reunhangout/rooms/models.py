from django.db import models
from django.conf import settings

class RoomManager(models.Manager):
    def add(self, path, user):
        room, created = Room.objects.get_or_create(path=path)
        room.members.add(user)
        return room

    def remove(self, path, user):
        try:
            room = Room.objects.get(path=path)
        except Room.DoesNotExist:
            return None
        room.members.remove(user)
        return room

class Room(models.Model):
    path = models.CharField(max_length=255, unique=True)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL)

    objects = RoomManager()

    def __str__(self):
        return self.path

    def serialize(self):
        return {
            'path': self.path,
            'members': [m.serialize_public() for m in self.members.all()]
        }
