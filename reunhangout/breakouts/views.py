import json

from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.shortcuts import render

from breakouts.models import Breakout
from accounts.utils import serialize_auth_state
from reunhangout.utils import json_dumps

# Create your views here.
@login_required
def breakout_detail(request, breakout_id):
    try:
        breakout = Breakout.objects.select_related().get(pk=breakout_id)
    except Breakout.DoesNotExist:
        raise Http404

    plenary = breakout.plenary
    closed = (
        bool(plenary) and
        (not plenary.open or not plenary.breakouts_open) and
        not plenary.has_admin(request.user)
    )
    if closed:
        raise Http404

    data = {
        'breakout': breakout.serialize(),
    }
    data.update(serialize_auth_state(request.user, plenary))

    return render(request, "breakouts/breakout_detail.html", {
        'data': json_dumps(data),
        'breakout': breakout,
        'plenary': plenary
    })

