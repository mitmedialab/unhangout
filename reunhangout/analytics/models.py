from django.db import models
from django.utils.timezone import now
from django.conf import settings

from plenaries.models import Plenary
from breakouts.models import Breakout

from jsonfield import JSONField

class Action(models.Model):
    TYPES = [
        "error",
        # plenary
        "join_plenary",
        "leave_plenary",
        "plenary_chat",
        "open_plenary",
        "close_plenary",
        "open_breakouts",
        "close_breakouts",
        "change_embeds",
        "start_play_for_all",
        "stop_play_for_all",
        "change_auth",
        "message_breakouts",
        # breakout actions from plenary
        "propose_breakout",
        "change_breakout_vote",
        "join_breakout",
        "leave_breakout",
    ]

    action = models.CharField(
        max_length=20,
        choices=[(a, a.replace('_', ' ')) for a in sorted(TYPES)]
    )
    timestamp = models.DateTimeField(default=now)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True,
            on_delete=models.CASCADE)
    plenary = models.ForeignKey(Plenary, blank=True, null=True,
            on_delete=models.SET_NULL)
    breakout = models.ForeignKey(Breakout, blank=True, null=True,
            on_delete=models.SET_NULL)
    data = JSONField(blank=True, null=True)

    def __str__(self):
        return "{} {} {}".format(self.user, self.action, self.timestamp)

def track(action, user=None, data=None, plenary=None, breakout=None):
    kwargs = {
        'action': action,
        'user': user,
        'plenary': plenary,
        'breakout': breakout
    }

    if plenary is not None:
        # Mirror plenary onto data to disambiguate in case plenary is deleted.
        data = data or {}
        data['plenary'] = {'id': plenary.id}

    if breakout is not None:
        # Mirror breakout onto data to disambiguate in case plenary is deleted.
        data = data or {}
        data['breakout'] = {'id': breakout.id}
        if plenary is None and breakout.plenary_id is not None:
            data['plenary'] = {'id': breakout.plenary_id}
            del kwargs['plenary']
            kwargs['plenary_id'] = breakout.plenary_id

    kwargs['data'] = data

    return Action.objects.create(**kwargs)
