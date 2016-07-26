from django.shortcuts import render
from django.http import Http404

from breakouts.models import Breakout
from accounts.utils import serialize_auth_state

# Create your views here.
def breakout_detail(request, breakout_id):
    try:
        breakout = Breakout.objects.select_related().filter(pk=breakout_id)
    except Breakout.DoesNotExist:
        raise Http404

    plenary = breakout.plenary
    if plenary and (not plenary.open or not plenary.breakouts_open):
        raise Http404

    data = breakout.serialize()
    data.update(serialize_auth_state(request.user, plenary))

    return render(request, "breakouts/breakout.html", {
        'data': json.dumps(data),
        'breakout': breakout,
        'plenary': plenary
    })

