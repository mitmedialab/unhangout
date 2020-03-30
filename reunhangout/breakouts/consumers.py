from django.contrib.sites.models import Site
from django.core.mail import mail_admins

from reunhangout.channels_utils import prepare_message, send_to_channel
from reunhangout.utils import json_dumps
from analytics.models import track
from plenaries.models import Plenary
from breakouts.models import Breakout
from breakouts.models import ErrorReport

from channels.generic.websocket import WebsocketConsumer
from channels_presence.models import Room, Presence
from channels_presence.decorators import touch_presence, remove_presence

from urllib.parse import urlparse
import re
import json
import logging

logger = logging.getLogger('django.request')


class BreakoutConsumer(WebsocketConsumer):

    def handle_error(self, error):
        data = prepare_message(type='error', error=error)
        self.send(text_data=data['text'])
        track("error", self.scope['user'], data)

    def send_over_capacity_error(self):
        return self._join_error("over-capacity", "Over capacity")

    def send_already_connected_error(self):
        return self._join_error("already-connected", "Already connected")

    def _join_error(self, error_code, error_msg):
        data = {
            'channel_name': self.channel_name,
            'members': [],
            'error': error_msg,
            "error_code": error_code,
        }
        #self.send(text_data=prepare_message(type='presence', payload=data).get('text_data'))
        self.send(text_data=json.dumps({'type': 'presence', 'payload': data}))
        track("error", self.scope['user'], data)

    def connect(self):
        self.accept()
        self.breakout_id = self.scope['url_route']['kwargs']['breakout_id']
        breakout_id = self.breakout_id
        if not self.scope['user'].is_authenticated:
            return self.handle_error("Authentication required")
        try:
            breakout = Breakout.objects.active().get(pk=breakout_id)
        except Breakout.DoesNotExist:
            return self.handle_error( 'Breakout not found')

        self.connect_to_breakout(breakout)

    @remove_presence
    def disconnect(self, close_code):
        if self.breakout_id:
            try:
                breakout = Breakout.objects.get(pk=breakout_id)
            except Breakout.DoesNotExist:
                breakout = None
            track("leave_breakout", self.scope['user'], breakout=breakout)


    @touch_presence
    def receive(self, text_data):
        print(text_data)
        try:
            breakout = Breakout.objects.get(id=self.breakout_id)
        except Breakout.DoesNotExist:
            return self.handle_error("Breakout not found")

        data = json.loads(text_data)
        if 'type' not in data:
            self.handle_error("Missing type")
        elif data['type'] == "DISCONNECTING_OTHERS":
            self.handle_disconnecting_others(data, breakout)
        elif data['type'] == "ERROR_REPORT":
            self.handle_error_report(data, breakout)
        elif data['type'] == "record_speaker_stats":
            self.handle_record_speaker_stats(data, breakout)
        else:
            self.handle_error("Type not understood")

    def forward_to_client(self, event):
        print(event)
        self.send(text_data=event['text'])

    def connect_to_breakout(self, breakout):
        num_connections = Presence.objects.filter(
            room__channel_name=breakout.channel_group_name).count()

        # Enforce max attendees.
        if num_connections >= breakout.max_attendees:
            return self.send_over_capacity_error()

        elif self.scope['user'].is_authenticated and Presence.objects.filter(
                room__channel_name__startswith=Breakout.CHANNEL_GROUP_NAME_PREFIX,
                user=self.scope['user']
            ).exists():
            # Only one connection per user.
            return self.send_already_connected_error()

        room = Room.objects.add(
            breakout.channel_group_name,
            self.channel_name,
            self.scope['user']
        )
        track("join_breakout", self.scope['user'], breakout=breakout)

    def handle_disconnecting_others(self, data, breakout):
        if not self.scope['user'].is_authenticated:
            self.handle_error("Can't disconnect others when not authenticated")
            return

        presences = Presence.objects.filter(
            room__channel_name__startswith=Breakout.CHANNEL_GROUP_NAME_PREFIX,
            user=self.scope['user']
        )
        for presence in presences:
            if presence.channel_name != self.channel_name:
                presence.room.remove_presence(presence=presence)
                data = {
                    'channel_name': self.channel_name,
                    'members': [],
                    'error': 'Already connected',
                    "error_code": 'already-connected',
                }
                send_to_channel(presence.room.channel_name, **data)
                #send_already_connected_error(
                #    MessageProxy(presence.channel_name, user=self.scope['user']),
                #)

        connect_to_breakout(message, breakout)

    #@require_payload_keys(['collected_data', 'additional_info'])
    def handle_error_report(self, data, breakout):
        report = ErrorReport.objects.create(
            user=self.scope['user'],
            breakout=breakout,
            collected_data=data['payload']['collected_data'],
            additional_info=data['payload']['additional_info'],
        )
        msg = "\n".join(
            """
            {user} reported the following problem while connecting to {breakout}.
            Details: https://{domain}/admin/breakout/{id}/change
            ---
            {additional_info}
            ---
            {collected_data}
            """.format(
                user=str(self.scope['user']),
                breakout=str(breakout),
                domain=Site.objects.get_current().domain,
                id=report.id,
                additional_info=report.additional_info,
                collected_data=report.collected_data,
            ).strip().split("\n" + (" " * 8))
        )
        try:
            mail_admins("Breakout error report", msg, fail_silently=False)
        except Exception as e:
            logger.exception(e)

    #@require_payload_keys(['speakerStats'])
    def handle_record_speaker_stats(self, data, breakout):
        track("record_speaker_stats", self.scope['user'], {'speakerStats': data['payload']['speakerStats']}, breakout=breakout) 


class MessageProxy(object):
    def __init__(self, channel_name, user):
        self.reply_channel = Channel(channel_name)
        self.user = user
