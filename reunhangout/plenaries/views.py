import json

from django.http import Http404
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required

from channels_presence.models import Room
from plenaries.models import Plenary
from videosync.models import VideoSync
from accounts.utils import serialize_auth_state
from reunhangout.utils import json_dumps
from reunhangout.channels_utils import serialize_room

@login_required
def plenary_detail(request, id_or_slug):
    try:
        return redirect(Plenary.objects.get(pk=id_or_slug).get_absolute_url())
    except (Plenary.DoesNotExist, ValueError):
        pass
    try:
        plenary = Plenary.objects.select_related().prefetch_related(
            'breakout_set', 'breakout_set__votes', 'chatmessage_set', 'admins'
        ).get(slug=id_or_slug)
    except Plenary.DoesNotExist:
        raise Http404

    breakouts = list(plenary.breakout_set.all())

    data = {
        'plenary': plenary.serialize(),
        'breakouts':  [breakout.serialize() for breakout in breakouts],
        'chat_messages': [msg.serialize() for msg in plenary.chatmessage_set.all()],
    }
    data.update(serialize_auth_state(request.user, plenary))

    try:
        videosync = VideoSync.objects.get(sync_id=data['plenary']['video_sync_id'])
    except VideoSync.DoesNotExist:
        videosync = None
        data['videosync'] = {}
    else:
        videosync_data = videosync.serialize()
        videosync_data['synced'] = True
        data['videosync'] = {videosync.sync_id: videosync_data}

    data['breakout_presence'] = {}
    for breakout in breakouts:
        try:
            room = Room.objects.get(channel_name=breakout.channel_group_name)
        except Room.DoesNotExist:
            data['breakout_presence'][breakout.id] = {}
        else:
            data['breakout_presence'][breakout.id] = serialize_room(room)
            data['breakout_presence']['breakout_id'] = breakout.id

    return render(request, "plenaries/plenary.html", {
        'data': json_dumps(data),
        'plenary': plenary,
    })

def plenary_list(request):
    pass

