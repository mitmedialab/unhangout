from collections import defaultdict, OrderedDict
from datetime import timedelta, datetime
from django.db.models import Prefetch
from django.core.serializers.json import DjangoJSONEncoder
import json

from analytics.models import Action 
from accounts.models import User
from plenaries.models import ChatMessage

def _join_leave_to_duration(joinleave):
    total = timedelta(seconds=0)
    for obj in joinleave:
        if obj['leave'] is not None and obj['join'] is not None:
            total += obj['leave'] - obj['join']
    return total.total_seconds()

def _fit_to_joinleave(leave, joinleave):
    closest = None
    closest_delta = None
    for obj in joinleave:
        if obj['leave'] is not None:
            continue

        delta = leave - obj['join']
        if closest_delta is None or delta < closest_delta:
            closest_delta = delta
            closest = obj
    if closest:
        closest['leave'] = leave


def json_datetime_serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError("Type %s is not serializable" % type(obj))

class JSONEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, (set, frozenset)):
            return tuple(obj)
        return super().default(obj)

def plenary_analytics(plenary_queryset, fmt='python'):
    # What users were there?
    # How long was each user in the lobby?
    # What breakout(s) did the user join?
    # What breakout(s) did the user propose?
    # What breakout(s) did the user vote on?
    # How long were they in the breakouts?
    # How many chat messages did they send?
    # How many chat messages had mentions in them?

    plenary_actions = ("join_plenary", "leave_plenary")
    breakout_actions = ("join_breakout", "leave_breakout", "propose_breakout",
            "change_breakout_vote")

    actions = list(
        Action.objects.select_related(
            'user', 'breakout', 'plenary'
        ).prefetch_related(
            Prefetch(
                'plenary__chatmessage_set',
                ChatMessage.objects.prefetch_related(
                    Prefetch(
                        'mentions',
                        User.objects.all(),
                        to_attr='_mentions_prefetch'
                    )
                ),
                to_attr='_chat_messages_prefetch'
            )
        ).filter(
            action__in=plenary_actions + breakout_actions,
            plenary__in=plenary_queryset,
            user__isnull=False,
        ).order_by('plenary', 'user', 'timestamp')
    )

    plenary_data = defaultdict(lambda: {
        "users": defaultdict(lambda: {
            'user': None,
            'event_presence': [],
            'breakout_presence': defaultdict(list),
            'breakout_votes': [],
            'breakout_proposals': [],
            'chat_message_count': 0,
            'chat_message_with_mentions_count': 0,
            'chat_messages': [],
            'chat_messages_mentioned': [],
            'first_action_timestamp': None,
            'last_action_timestamp': None,
            'breakout_copresence': {}
        }),
        "breakouts": defaultdict(lambda: {
            'id': None,
            'title': '',
            'copresence': set()
        }),
    })
    all_plenaries = {}

    for action in actions:
        all_plenaries[action.plenary_id] = action.plenary
        
        log = plenary_data[action.plenary_id]['users'][action.user.id]
        log['user'] = {
            'id': action.user.id,
            'display_name': action.user.get_display_name(),
            "email": action.user.email,
        }
        if log['first_action_timestamp'] is None:
            log['first_action_timestamp'] = action.timestamp
            log['last_action_timestamp'] = action.timestamp
        if action.timestamp > log['last_action_timestamp']:
            log['last_action_timestamp'] = action.timestamp

        if action.action == "join_plenary":
            log['event_presence'].append({
                'join': action.timestamp, 'leave': None
            })
        elif action.action == "leave_plenary":
            _fit_to_joinleave(action.timestamp, log['event_presence'])
        elif action.action in breakout_actions:
            breakout_id = (
                action.data.get('breakout', {}).get('id') or
                action.breakout_id
            )
            if not breakout_id:
                continue
            if action.breakout_id:
                plenary_data[action.plenary_id]['breakouts'][
                        action.breakout_id].update({
                    'id': action.breakout.id,
                    'title': action.breakout.title,
                })

            if action.action == "join_breakout":
                log['breakout_presence'][breakout_id].append({
                    'join': action.timestamp, 'leave': None
                })
            elif action.action == "leave_breakout":
                _fit_to_joinleave(
                    action.timestamp,
                    log['breakout_presence'][breakout_id]
                )
            elif action.action == "propose_breakout":
                log['breakout_proposals'].append(breakout_id)
            elif action.action == "change_breakout_vote":
                log['breakout_votes'].append(breakout_id)

    for plenary_id, plenary in all_plenaries.items():
        for msg in plenary._chat_messages_prefetch:
            log = plenary_data[plenary.id]['users'][msg.user.id]
            log['chat_message_count'] += 1
            if len(msg._mentions_prefetch) > 0:
                log['chat_message_with_mentions_count'] += 1
            log['chat_messages'].append({
                'id': msg.id,
                'timestamp': msg.created,
                'message': msg.message,
                'highlight': msg.highlight,
                'archived': msg.archived,
                'mentions': [m.id for m in msg._mentions_prefetch],
            })

        copresence = Action.objects.breakout_copresence(plenary)
        by_breakout = {}
        for user_id, breakout_copresence in copresence.items():
            for breakout_id, user_ids in breakout_copresence.items():
                plenary_data[plenary_id]['users'][user_id][
                        'breakout_copresence'] = breakout_copresence
                plenary_data[plenary_id]['breakouts'][breakout_id][
                        'copresence'].add(frozenset(
                            set(user_ids) | set([user_id])
                        ))


    output = OrderedDict()
    for plenary_id, datadict in sorted(plenary_data.items()):
        # Convert start/leave times to durations.
        for user_id, log in datadict['users'].items():
            log['event_presence_seconds'] = _join_leave_to_duration(
                log['event_presence']
            )
            log['breakout_presence_seconds'] = {}
            for breakout_id, joinleave in log['breakout_presence'].items():
                dur = _join_leave_to_duration(joinleave)
                log['breakout_presence_seconds'][breakout_id] = dur

        # Sort by first action
        output[plenary_id] = {
            'users': OrderedDict(
                sorted(
                    [(k, OrderedDict(sorted(v.items())))
                    for k,v in datadict['users'].items()],
                    key=lambda o: o[1]['first_action_timestamp']
                )
            ),
            'breakouts': OrderedDict(
                sorted([(k, OrderedDict(sorted(v.items())))
                    for k,v in datadict['breakouts'].items()])
            ),
        }
    output = {'plenaries': output}
            
    if fmt == 'python':
        return output
    elif fmt == 'json':
        return json.dumps(output, cls=JSONEncoder, indent=2)
    else:
        raise ValueError("Format {} not understood.".format(fmt))

