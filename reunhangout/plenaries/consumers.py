from django.db import transaction

from channels.generic.websocket import WebsocketConsumer

from channels_presence.models import Room, Presence
from channels_presence.decorators import touch_presence, remove_presence

from plenaries.models import Plenary, ChatMessage
from analytics.models import track
from reunhangout.channels_utils import (
    broadcast, handle_error, require_payload_keys, prepare_message,
    send_to_channel
)


import re
import json

class PlenaryConsumer(WebsocketConsumer):

    def connect(self):
        self.slug = self.scope['url_route']['kwargs']['slug']
        try:
            plenary = Plenary.objects.get(slug=self.slug)
            self.plenary = plenary
        except Plenary.DoesNotExist:
            return handle_error(message,  'Plenary not found')  # TODO

        # Handle max connections
        ## TODO
        #if plenary.max_participants > 0 and not plenary.has_admin(self.scope['user']):
        #    num_present = Presence.objects.filter(
        #        room__channel_name=plenary.channel_group_name
        #    ).count()
        #    if num_present > plenary.max_participants:
        #        return self.close()

        # TODO
        #if plenary.open and not self.scope['user'].is_authenticated:
        #    return handle_error(message, "Authentication required to connect to open plenaries")  # TODO

        self.accept()
        Room.objects.add(plenary.channel_group_name, self.channel_name, self.scope['user'])
        track("join_plenary", self.scope['user'], plenary=plenary)

    @remove_presence
    def disconnect(self, close_code):
        slug = self.scope['url_route']['kwargs']['slug']
        try:
            plenary = Plenary.objects.get(slug=slug)
        except Plenary.DoesNotExist:
            plenary = None
        track("leave_plenary", self.scope['user'], plenary=plenary)

        # Remove live participant record if any, so that participants who close
        # their tab or refresh have to explicitly reconnect. Issue #44.
        if plenary:
            if plenary.live_participants.filter(id=self.scope['user'].id).exists():
                payload = {'payload': {'username': self.scope['user'].username}}
                # TODO handle_remove_live_participant(message, payload, plenary)

    @touch_presence
    def receive(self, text_data):
        print(text_data)
        data = json.loads(text_data)
        if 'type' not in data:
            pass
            #TODO handle_error(message, "Missing type")
        elif data['type'] == "chat":
            self.handle_chat(data)

    def handle_chat(self, data):
        highlight = (
            data['payload'].get('highlight') and \
            (self.scope['user'].is_superuser or plenary.has_admin(self.scope['user']))
        )
        with transaction.atomic():
            chat_message = ChatMessage.objects.create(
                plenary=self.plenary,
                user=self.scope['user'],
                message=data['payload']['message'],
                highlight=highlight or False
            )
            # He comes. https://stackoverflow.com/a/1732454
            user_ids = re.findall(
                r'''<span [^>]*(?<= )data-mention-user-id=['"](\d+)['"][^>]*>''', 
                data['payload']['message']
            )
            mentions = self.plenary.associated_users().filter(id__in=user_ids)
            chat_message.mentions.set(mentions)

            data = chat_message.serialize()
            broadcast(self.plenary.channel_group_name, type='chat', payload=data)
            track("plenary_chat", self.scope['user'], data, plenary=self.plenary)

    def presence(self, event):
        print(event)
        self.send(text_data=event['text'])

    def chat(self, event):
        print(event)
        self.send(text_data=event['text'])


def handle_breakout(message, data, plenary):
    is_admin = plenary.has_admin(message.user)
    admin_required_error = lambda: handle_error(message, "Must be an admin to do that.")

    payload = data['payload']
    action = payload['action']

    if not is_admin and not (
            plenary.breakout_mode == "user" or
            (plenary.breakout_mode == "random" and action == "group_me")):
        return admin_required_error()

    def respond_with_breakouts():
        # Not-too-efficient strategy: always respond with the full list of
        # breakouts from a new database query.  We can optimize this later if
        # needed.
        broadcast(plenary.channel_group_name, type='breakout_receive',
            payload=[b.serialize() for b in plenary.breakout_set.active()])

    # Handle actions

    if action == 'create':
        if not is_admin and plenary.breakout_mode != "user":
            return admin_required_error()
        if 'title' not in payload:
            return handle_error(message, "Missing 'title'")
        if is_admin:
            etherpad_initial_text = payload.get('etherpad_initial_text', '')
        else:
            etherpad_initial_text = None
        breakout = Breakout(
            plenary=plenary,
            title=payload['title'],
            etherpad_initial_text=etherpad_initial_text,
            max_attendees=payload.get('max_attendees') or 10,
            is_proposal=(not is_admin or payload.get('is_proposal', False)),
            proposed_by=message.user
        )
        breakout.full_clean()
        breakout.save()
        if breakout.is_proposal:
            track("propose_breakout", message.user, breakout=breakout)
        return respond_with_breakouts()

    elif action == 'group_me':
        if plenary.breakout_mode != "random":
            return handle_error(message, "Must be in random mode to do that.")
        blacklist = set()
        # Remove membership, if any, from current breakouts
        for breakout in plenary.breakout_set.filter(members=message.user):
            breakout.members.remove(message.user)
            # Add to blacklist so we don't just rejoin this group.
            blacklist.add(breakout.id)

        # Place in an existing breakout, if available
        available_random_breakouts = plenary.breakout_set.active().exclude(
            id__in=blacklist
        ).annotate(
            member_count=Count('members')
        ).filter(
            is_random=True,
            member_count__lt=F('max_attendees')
        )
        try:
            breakout = available_random_breakouts[0]
        except IndexError:
            breakout = Breakout.objects.create(
                    plenary=plenary,
                    title='Breakout',
                    max_attendees=plenary.random_max_attendees,
                    is_random=True)
        breakout.members.add(message.user)
        return respond_with_breakouts()

    # For all actions other than create, we expect payload['id'] to contain the
    # id of the breakout to operate on.

    try:
        breakout = plenary.breakout_set.active().get(id=payload['id'])
    except (Breakout.DoesNotExist, KeyError):
        return handle_error(message, "Breakout not found.")

    if action == 'delete':
        if not is_admin:
            return admin_required_error()
        breakout.active = False
        breakout.save()
        return respond_with_breakouts()

    elif action == 'modify':
        can_modify = (
            is_admin or
            (plenary.breakout_mode == "user" and breakout.proposed_by == message.user)
        )
        if not can_modify:
            if plenary.breakout_mode == "user":
                return handle_error(message, "Must be breakout proposer or admin to do that")
            return admin_required_error()
        if 'title' in payload:
            breakout.title = payload['title']
        breakout.save()
        return respond_with_breakouts()

    elif action == 'approve':
        if not is_admin:
            return admin_required_error()

        breakout.is_proposal = not breakout.is_proposal
        breakout.save()
        return respond_with_breakouts()

    elif action == 'vote':
        if plenary.breakout_mode != "user":
            return handle_error(message, "Can only vote on user-proposed breakouts")
        # Toggle vote
        if breakout.votes.filter(pk=message.user.pk).exists():
            breakout.votes.remove(message.user)
        else:
            breakout.votes.add(message.user)
        track("change_breakout_vote", message.user, breakout=breakout)
        return respond_with_breakouts()

