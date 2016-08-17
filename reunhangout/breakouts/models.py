import re

from django.db import models
from django.conf import settings
from django.contrib.sites.models import Site
from django.core.urlresolvers import reverse
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils.translation import ugettext_lazy as _
from django.template.defaultfilters import slugify
from jsonfield import JSONField
from richtext.utils import sanitize

class GoogleHangout(models.Model):
    url = models.CharField(max_length=255)

    def __str__(self):
        return self.url

class Breakout(models.Model):
    title = models.CharField(max_length=100, default="", blank=True)
    slug = models.SlugField(blank=True)
    description = models.TextField(blank=True, default="")
    max_attendees = models.IntegerField(default=10, validators=[
        MinValueValidator(2),
        MaxValueValidator(10),
    ])
    activities = JSONField(blank=True, null=True)
    history = JSONField(blank=True, null=True)

    plenary = models.ForeignKey('plenaries.Plenary',
            on_delete=models.CASCADE,
            blank=True, null=True)
    is_hoa = models.BooleanField(default=False)
    is_proposal = models.BooleanField(default=False)
    is_random = models.BooleanField(default=False)

    google_hangout = models.OneToOneField(GoogleHangout,
            on_delete=models.SET_NULL,
            blank=True, null=True)
    google_hoa = models.CharField(max_length=255, blank=True)

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

    @property
    def channel_group_name(self):
        return "breakout-%s" % self.pk

    @classmethod
    def id_from_channel_group_name(cls, channel_group_name):
        if channel_group_name.startswith("breakout-"):
            return channel_group_name[len("breakout-"):]

    @property
    def webrtc_id(self):
        src = '{}-{}'.format(Site.objects.get_current(), self.channel_group_name)
        return re.sub('[^a-zA-Z0-9]', '', src)

    def safe_description(self):
        return sanitize(self.description)

    def get_absolute_url(self):
        return reverse("breakout_detail", args=[self.pk])

    def serialize(self):
        if self.is_proposal:
            votes = [v.serialize_public() for v in self.votes.all()]
        else:
            votes = []
        if self.is_random:
            members = [m.serialize_public() for m in self.members.all()]
        else:
            members = []
        return {
            'id': self.id,
            'title': self.title,
            'slug': self.slug,
            'webrtc_id': self.webrtc_id,
            'url': self.get_absolute_url(),
            'description': self.safe_description(),
            'max_attendees': self.max_attendees,
            'activities': self.activities,
            'history': self.history,
            'plenary': self.plenary.id if self.plenary else None,
            'is_hoa': self.is_hoa,
            'is_proposal': self.is_proposal,
            'is_random': self.is_random,
            'google_hangout': self.google_hangout.url if self.google_hangout else None,
            'google_hoa': self.google_hoa,
            'proposed_by': self.proposed_by.serialize_public() if self.proposed_by else None,
            'mode': self.plenary.breakout_mode if self.plenary else "permalink",
            'open': self.plenary.breakouts_open if self.plenary else True,
            'votes': votes,
            'members': members,
        }

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = '{}-{}'.format(slugify(self.title), self.pk)
        super(Breakout, self).save(*args, **kwargs)

    def __str__(self):
        return self.title
