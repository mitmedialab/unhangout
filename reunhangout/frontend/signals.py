from django.dispatch import receiver

from channels_presence.signals import presence_changed
from channels_presence.models import Room
from reunhangout.channels_utils import broadcast, serialize_room
from breakouts.models import Breakout
from plenaries.models import Plenary

@receiver(presence_changed, sender=Room, dispatch_uid='broadcast_presence')
def broadcast_presence(sender, room=None, added=None, removed=None, bulk_change=None, **kwargs):
    data = serialize_room(room)
    # always broadcast presence info to the pertinent room.
    broadcast(room.channel_name, type='presence', payload=data)

    # if this is a breakout channel, also broadcast to the pertinent plenary to
    # update breakout list presence.
    breakout_id = Breakout.id_from_channel_group_name(room.channel_name)
    if breakout_id:
        for plenary in Plenary.objects.filter(breakout__id=breakout_id):
            data['breakout_id'] = breakout_id
            broadcast(plenary.channel_group_name, type='breakout_presence', payload=data)

