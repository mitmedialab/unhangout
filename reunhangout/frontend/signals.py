from django.dispatch import receiver

from channels_presence.signals import presence_changed
from channels_presence.models import Room
from reunhangout.channels_utils import broadcast

@receiver(presence_changed, sender=Room, dispatch_uid='broadcast_presence')
def broadcast_presence(sender, room=None, added=None, removed=None, bulk_change=None, **kwargs):
    broadcast(room.channel_name, type='present', payload={
        'channel_name': room.channel_name,
        'members': [m.serialize_public() for m in room.get_users()],
        'lurkers': room.get_anonymous_count(),
    })
