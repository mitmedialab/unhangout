import json
import re

from django.http import Http404, HttpResponseBadRequest, JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_slug
from django.db import transaction
from django.utils.timezone import now
from django.views.decorators.csrf import ensure_csrf_cookie

from channels_presence.models import Room
from plenaries.models import Plenary
from plenaries.channels import update_plenary
from videosync.models import VideoSync
from accounts.utils import serialize_auth_state
from reunhangout.utils import json_dumps
from reunhangout.channels_utils import serialize_room

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

    messages.info(request, "You must be signed in to attend events.")
    if plenary.open and not request.user.is_authenticated():
        return redirect('%s?next=%s' % (settings.LOGIN_URL, request.path))

    breakouts = list(plenary.breakout_set.all())

    # Most recent 100 messages, but presented in ascending order.
    chat_messages = reversed(plenary.chatmessage_set.order_by('-created')[0:100])
    data = {
        'plenary': plenary.serialize(),
        'breakouts':  [breakout.serialize() for breakout in breakouts],
        'chat_messages': [msg.serialize() for msg in chat_messages],
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
    plenaries = Plenary.objects.filter(
        end_date__gte=now(),
        public=True,
        canceled=False
    ).order_by('start_date')
    return render(request, "plenaries/plenary_list.html", {
        'plenaries': plenaries
    })

@login_required
@ensure_csrf_cookie
def plenary_add(request):
    if request.method == 'POST':
        try:
            payload = json.loads(request.POST.get('data'))
        except ValueError:
            return HttpResponseBadRequest("Invalid JSON")
        plenary = Plenary()
        try:
            update_plenary(plenary, payload)
        except ValidationError as e:
            return HttpResponseBadRequest(json_dumps(e.message_dict))
        with transaction.atomic():
            plenary.save()
            plenary.admins.add(request.user)
    return render(request, "plenaries/plenary_add.html")

def slug_check(request):
    slug = request.GET.get("slug")
    id_ = request.GET.get("id")
    if not slug:
        raise HttpResponseBadRequest("Missing 'slug' or 'id' params")

    # No case sensitive slugs for us.
    slug = slug.lower()
    if re.match('^[0-9]+$', slug):
        return JsonResponse({
            "slug": slug,
            "available": False,
            "error": "Slug must contain at least one letter."
        })

    try:
        validate_slug(slug)
    except ValidationError as e:
        return JsonResponse({
            "slug": slug,
            "available": False,
            "error": str(e.message)
        })

    if id_ is not None:
        qs = Plenary.objects.exclude(id=id_)
    else:
        qs = Plenary.objects.all()
    available = not qs.filter(slug=slug).exists()
    return JsonResponse({
        "slug": slug,
        "available": available
    })


