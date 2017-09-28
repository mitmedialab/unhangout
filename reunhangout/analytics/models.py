from collections import defaultdict

from django.db import models
from django.utils.timezone import now
from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from plenaries.models import Plenary
from breakouts.models import Breakout

from jsonfield import JSONField

def spans_overlap(spans1, spans2):
    """
    Return true if any of the (start, end) spans in spans1 and spans2 overlap.
    """
    for start, end in spans1:
        for start2, end2 in spans2:
            if start <= end2 and start2 <= end:
                return True
    return False

class ActionManager(models.Manager):
    def breakout_copresence(self, plenary):
        """
        Return a mapping of {user_id: {breakout_id: [user_id,...]}}
        representing the copresence of all users who attended breakouts
        together in the given plenary.
        """
        # Get join/leave actions for all users for these breakouts.
        actions = Action.objects.filter(
            plenary=plenary,
            action__in=('join_breakout', 'leave_breakout')
        ).values_list('breakout__id', 'user__id', 'timestamp', 'action')
        actions_by_user = defaultdict(lambda: defaultdict(list))
        for breakout_id, user_id, timestamp, action in actions:
            actions_by_user[user_id][breakout_id].append((timestamp, action))

        # Assemble join/leave actions into spans.
        spans_by_breakout = defaultdict(lambda: defaultdict(list))
        for user_id, breakout_actions in actions_by_user.items():
            for breakout_id, action_list in breakout_actions.items():
                joined = None
                for timestamp, action in action_list:
                    if action == "join_breakout":
                        joined = timestamp
                    elif joined and action == "leave_breakout":
                        spans_by_breakout[breakout_id][user_id].append(
                            (joined, timestamp)
                        )
                        joined = None

        # Calculate temporal overlaps
        overlaps = defaultdict(lambda: defaultdict(set))
        for breakout_id, user_spans in spans_by_breakout.items():
            for user_id, spans in user_spans.items():
                for user_id2, spans2 in user_spans.items():
                    if user_id == user_id2:
                        continue
                    if spans_overlap(spans, spans2):
                        overlaps[user_id][breakout_id].add(user_id2)

        # Convert to normal dict.
        overlaps = {k: dict(d) for k,d in overlaps.items()}
        return overlaps

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
        "change_contact_card",
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

    objects = ActionManager()

    def __str__(self):
        return "{} {} {}".format(self.user, self.action, self.timestamp)

def track(action, user=None, data=None, plenary=None, breakout=None):
    kwargs = {
        'action': action,
        'user': None if isinstance(user, AnonymousUser) else user,
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
