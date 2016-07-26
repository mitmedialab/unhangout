import json

from django.http import Http404
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required

from plenaries.models import Plenary

def serialize_auth_state(request, plenary):
    if not request.user.is_authenticated():
        return {'auth': {'is_authenticated': False}}

    user = request.user
    return {
        'auth': {
            'is_authenticated': True,
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_superuser': user.is_superuser,
            'is_admin': user.is_superuser or plenary.admins.filter(pk=user.pk).exists(),
        }
    }


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

    data = plenary.serialize()
    data.update(serialize_auth_state(request, plenary))
    
    return render(request, "plenaries/plenary.html", {
        'data': json.dumps(data),
        'plenary': plenary,
    })

def plenary_list(request):
    pass

