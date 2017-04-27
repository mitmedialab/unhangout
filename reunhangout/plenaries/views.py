import json
import re
import csv
from io import StringIO

from django.http import Http404, HttpResponse, HttpResponseBadRequest, JsonResponse
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_slug
from django.db import transaction
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie

from breakouts.models import Breakout
from channels_presence.models import Room, Presence
from plenaries.models import Plenary, Series, ChatMessage
from plenaries.channels import update_plenary
from videosync.models import VideoSync
from accounts.utils import serialize_auth_state
from reunhangout.utils import json_dumps
from reunhangout.channels_utils import serialize_room

def plenary_detail(request, id_or_slug):
    if re.match('^\d+$', id_or_slug):
        query = {'id': id_or_slug}
    else:
        query = {'slug': id_or_slug}
    try:
        plenary = Plenary.objects.all().get(**query)
    except Plenary.DoesNotExist:
        raise Http404
    if id_or_slug != plenary.slug:
        return redirect(plenary.get_absolute_url())

    if plenary.open and not request.user.is_authenticated():
        messages.info(request, "You must be signed in to attend events.")
        return redirect('%s?next=%s' % (settings.LOGIN_URL, request.path))

    if plenary.max_participants > 0 and not plenary.has_admin(request.user):
        num_present = Presence.objects.filter(
            room__channel_name=plenary.channel_group_name
        ).count()
        if (num_present + 1) > plenary.max_participants:
            return render(request, "plenaries/over_capacity.html", {'plenary': plenary})

    # Minimum fields to render the signed out plenary view.
    data = {
        'plenary': {
            'id': plenary.id,
            'name': plenary.name,
            'slug': plenary.slug,
            'url': plenary.get_absolute_url(),
            'organizer': plenary.organizer,
            'image': plenary.image.url if plenary.image else None,
            'start_date': plenary.start_date.isoformat(),
            'end_date': plenary.end_date.isoformat(),
            'doors_open': plenary.doors_open.isoformat(),
            'doors_close': plenary.doors_close.isoformat(),
            'canceled': plenary.canceled,
            'time_zone': str(plenary.time_zone),
            'public': plenary.public,
            'description': plenary.safe_description(),
            'open': plenary.open,
            'breakouts_open': plenary.breakouts_open,
        }
    }

    # If authenticated, fetch full fields.
    if request.user.is_authenticated():
        data['plenary'].update({
            'whiteboard': plenary.safe_whiteboard(),
            'breakout_mode': plenary.breakout_mode,
            'embeds': plenary.embeds,
            'history': plenary.history,
            'admins': list(plenary.admins.values_list('id', flat=True)),
            'live_participants': list(plenary.live_participants.values_list('id', flat=True)),
            'video_sync_id': plenary.channel_group_name,
            'webrtc_id': plenary.webrtc_id
        })
        breakouts = Breakout.objects.filter(
            plenary=plenary).select_related().prefetch_related('votes', 'members')
        data['breakouts'] = [b.serialize() for b in plenary.breakout_set.all()]

        chat_messages = ChatMessage.objects.filter(
            plenary=plenary
        ).prefetch_related('mentions').order_by('-created')[0:100]
        data['chat_messages'] = [c.serialize() for c in reversed(chat_messages)]
        data['users'] = {u.id: u.serialize_public() for u in plenary.associated_users()}

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

    data.update(serialize_auth_state(request.user, plenary))
    return render(request, "plenaries/plenary.html", {
        'data': json_dumps(data),
        'plenary': plenary,
    })

def plenary_list(request):
    plenaries = Plenary.objects.filter(
        end_date__gte=timezone.now(),
        public=True,
        canceled=False
    ).order_by('start_date')
    return render(request, "plenaries/plenary_list.html", {
        'plenaries': plenaries
    })

@login_required
@ensure_csrf_cookie
def plenary_add(request):
    copyable = Plenary.objects.filter(admins=request.user)
    if request.user.is_superuser and request.GET.get("copy_from_id"):
        copyable = copyable | Plenary.objects.filter(pk=request.GET['copy_from_id'])
    copyable_fields = ('name', 'image', 'organizer', 'time_zone', 'doors_close',
            'public', 'description', 'whiteboard', 'slug')
    serialized_fields = ('id', 'start_date', 'end_date') + copyable_fields

    if request.method == 'POST':
        try:
            payload = json.loads(request.POST.get('data'))
        except ValueError:
            return HttpResponseBadRequest("Invalid JSON")

        copy_from = None
        if payload.get('copy_from_id'):
            try:
                copy_from = copyable.get(id=payload.get('copy_from_id'))
            except Plenary.DoesNotExist:
                return HttpResponseBadRequest("copy_from_id plenary not found")

            for key in copyable_fields:
                if key not in payload:
                    payload[key] = getattr(copy_from, key)
            if copy_from.image and payload['image'] == copy_from.image.url:
                payload['image'] = copy_from.image


        try:
            with transaction.atomic():
                if copy_from and payload['slug'] == copy_from.slug:
                    series, created = Series.objects.get_or_create(slug=payload['slug'])
                    copy_from.series = series
                    copy_from.slug = str(copy_from.pk)
                    copy_from.save()

                plenary = Plenary()
                update_plenary(plenary, payload)
                plenary.save()
                plenary.admins.add(request.user)
                if copy_from:
                    for admin in copy_from.admins.all():
                        plenary.admins.add(admin)
                return HttpResponse("success")

        except ValidationError as e:
            return HttpResponseBadRequest(json_dumps(e.message_dict))

    copyable_data = {}
    for plenary in copyable:
        serialized = plenary.serialize()
        copyable_data[plenary.id] = {key: serialized[key] for key in serialized_fields}

    return render(request, "plenaries/plenary_add.html", {
        'copyable': copyable_data,
        'copy_from_id': request.GET.get("copy_from_id"),
    })

def slug_check(request):
    slug = request.GET.get("slug")
    id_ = request.GET.get("id")
    if not slug:
        return HttpResponseBadRequest("Missing 'slug' or 'id' params")

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


@login_required
def my_events(request):
    plenaries = request.user.plenary_set.order_by('-start_date')
    now = timezone.now() 
    return render(request, "plenaries/my_events.html", {
        'upcoming_plenaries': list(plenaries.filter(end_date__gte=now)),
        'past_plenaries': list(plenaries.filter(end_date__lt=now)),
    })


@login_required
def export_plenary_chat(request, plenary_id, format="csv"):
    try:
        plenary = Plenary.objects.get(pk=plenary_id)
    except Plenary.DoesNotExist:
        raise Http404
    if not plenary.has_admin(request.user):
        raise PermissionDenied

    chat_messages = ChatMessage.objects.select_related(
        'user'
    ).prefetch_related(
        'mentions'
    )

    if format == "csv":
        header = [
            "chat_id", "user", "user_id", "created", "message", "highlight",
            "archived", "mentions"
        ]
        sio = StringIO()
        writer = csv.writer(sio)
        writer.writerow(header)

        for msg in chat_messages:
            writer.writerow([
                str(msg.id),
                msg.user.get_display_name(),
                str(msg.user.id),
                msg.created.isoformat(),
                msg.message,
                "1" if msg.highlight else "",
                "1" if msg.archived else "",
                ",".join(str(u.id) for u in msg.mentions.all())
            ])
        content = sio.getvalue()
        filename = "{}-chat.csv".format(plenary.slug)
        content_type = "text/csv"
    elif format == "json":
        rows = []
        output = {
            'plenary': {
                'id': plenary.id,
                'slug': plenary.slug
            },
            'chat_messages': rows
        }
        for msg in chat_messages:
            rows.append({
                'id': msg.id,
                'user': {
                    'id': msg.user.id,
                    'display_name': msg.user.get_display_name(),
                },
                'created': msg.created.isoformat(),
                'highlight': msg.highlight,
                'archived': msg.archived,
                'mentions': [{
                    'id': m.id,
                    'display_name': m.get_display_name()
                } for m in msg.mentions.all()]
            })

        content = json.dumps(output, indent=4)
        filename = "{}-chat.json".format(plenary.slug)
        content_type = 'application/json'
    else:
        return HttpResponseBadRequest("Unrecognized format {}".format(format))

    response = HttpResponse(content)
    response['Content-type'] = content_type
    response['Content-Disposition'] = 'attatchment; filename={}'.format(filename)
    return response
