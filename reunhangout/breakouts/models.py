import logging
import requests

from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from django.urls import reverse
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils.translation import ugettext_lazy as _
from django.utils import timezone
from django.template.defaultfilters import slugify
from jsonfield import JSONField
from richtext.utils import sanitize
from reunhangout.utils import random_webrtc_id

logger = logging.getLogger('request')

class Breakout(models.Model):
    title = models.CharField(max_length=80, default="", blank=True)
    slug = models.SlugField(blank=True)
    description = models.TextField(blank=True, default="")
    max_attendees = models.IntegerField(default=6, validators=[
        MinValueValidator(2),
        MaxValueValidator(10),
    ])
    activities = JSONField(blank=True, null=True)
    history = JSONField(blank=True, null=True)

    etherpad_initial_text = models.TextField(default=None, blank=True, null=True)

    plenary = models.ForeignKey('plenaries.Plenary',
            on_delete=models.CASCADE,
            blank=True, null=True)
    is_proposal = models.BooleanField(default=False)
    is_random = models.BooleanField(default=False)

    proposed_by = models.ForeignKey(
            settings.AUTH_USER_MODEL,
            on_delete=models.SET_NULL,
            related_name='proposed_breakouts',
            blank=True, null=True)

    votes = models.ManyToManyField(
            settings.AUTH_USER_MODEL,
            related_name='voted_on_breakouts',
            blank=True)

    members = models.ManyToManyField(
            settings.AUTH_USER_MODEL,
            related_name='member_of_breakouts',
            blank=True)

    webrtc_id = models.CharField(max_length=100, default=random_webrtc_id,
            editable=False, unique=True)

    created = models.DateTimeField(default=timezone.now)

    CHANNEL_GROUP_NAME_PREFIX = "breakout-"

    @property
    def channel_group_name(self):
        return self.channel_group_name_from_id(self.pk)

    @property
    def etherpad_id(self):
        return self.webrtc_id

    @classmethod
    def id_from_channel_group_name(cls, channel_group_name):
        if channel_group_name.startswith("breakout-"):
            return channel_group_name[len("breakout-"):]

    @classmethod
    def channel_group_name_from_id(cls, pk):
        return "".join((cls.CHANNEL_GROUP_NAME_PREFIX, str(pk)))

    def associated_users(self):
        User = get_user_model()
        return User.objects.filter(
            models.Q(member_of_breakouts=self) |
            models.Q(voted_on_breakouts=self) |
            models.Q(proposed_breakouts=self) |
            models.Q(presence__room__channel_name=self.channel_group_name)
        ).distinct()

    def safe_description(self):
        return sanitize(self.description)

    def get_absolute_url(self):
        return reverse("breakout_detail", args=[self.pk])

    def get_initial_etherpad_text(self):
        if self.etherpad_initial_text is not None:
            return self.etherpad_initial_text
        if self.plenary and self.plenary.etherpad_initial_text is not None:
            return self.plenary.etherpad_initial_text
        return settings.ETHERPAD_DEFAULT_TEXT

    def create_etherpad(self):
        data = {
            'apikey': settings.ETHERPAD_API_KEY,
            'padID': self.etherpad_id,
            'text': self.get_initial_etherpad_text()
        }
        url = "https://{server}/api/1/createPad".format(
            server=settings.ETHERPAD_SERVER,
        )
        res = requests.get(url, data)
        if res.status_code != 200:
            logger.error("{} status {}: {}".format(
                url,
                res.status_code,
                res.text
            ))

    def get_etherpad_readonly(self):
        data = {
            'apikey': settings.ETHERPAD_API_KEY,
            'padID': self.etherpad_id,
        }
        url = "https://{server}/api/1/getReadOnlyID?".format(
            server=settings.ETHERPAD_SERVER,
        )
        res = requests.get(url, data)
        if res.status_code != 200:
            logger.error("{} status {}: {}".format(
                url,
                res.status_code,
                res.text
            ))
        return "https://{server}/p/{readOnlyID}".format(
            server=settings.ETHERPAD_SERVER,
            readOnlyID=res.json()['data']['readOnlyID']
        )

    def serialize(self):
        if self.is_proposal:
            votes = [v.id for v in self.votes.all()]
        else:
            votes = []
        if self.is_random:
            members = [m.id for m in self.members.all()]
        else:
            members = []
        if self.plenary_id:
            jitsi_server = self.plenary.jitsi_server
        else:
            jitsi_server = settings.JITSI_SERVERS[0]

        etherpad_initial_text = self.get_initial_etherpad_text()
        etherpad_start_open = (
            etherpad_initial_text and
            etherpad_initial_text != settings.ETHERPAD_DEFAULT_TEXT
        )

        return {
            'id': self.id,
            'title': self.title,
            'slug': self.slug,
            'webrtc_id': self.webrtc_id,
            'etherpad_id': self.etherpad_id,
            'etherpad_initial_text': etherpad_initial_text,
            'etherpad_start_open': etherpad_start_open,
            'url': self.get_absolute_url(),
            'description': self.safe_description(),
            'max_attendees': self.max_attendees,
            'activities': self.activities,
            'history': self.history,
            'plenary': self.plenary_id if self.plenary_id else None,
            'is_proposal': self.is_proposal,
            'is_random': self.is_random,
            'proposed_by': self.proposed_by_id if self.proposed_by_id else None,
            'votes': votes,
            'members': members,
            'jitsi_server': jitsi_server,
        }

    def save(self, *args, **kwargs):
        is_new = not self.pk

        if not self.slug:
            self.slug = '{}-{}'.format(slugify(self.title), self.pk)
        super(Breakout, self).save(*args, **kwargs)

        if is_new:
            self.create_etherpad()

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['created']

class ErrorReport(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    breakout = models.ForeignKey(Breakout, on_delete=models.CASCADE)
    created = models.DateTimeField(default=timezone.now)
    collected_data = models.TextField(blank=True, default="")
    additional_info = models.TextField(blank=True, default="")

    def __str__(self):
        return "Error %s" % self.created

    class Meta:
        ordering = ['-created']
