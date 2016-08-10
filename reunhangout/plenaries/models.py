import re

from django.db import models
from django.conf import settings
from django.core.urlresolvers import reverse
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils.translation import ugettext_lazy as _
from richtext.utils import sanitize

from jsonfield import JSONField
from timezone_field import TimeZoneField

class Series(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(help_text="Short name for URL")
    organizer = models.CharField(max_length=100, default="", blank=True)
    image = models.ImageField(upload_to="series", blank=True, null=True)
    description = models.TextField(default="", blank=True)
    start_date = models.DateTimeField(_("Start date (UTC)"))
    end_date = models.DateTimeField(_("End date (UTC)"))
    time_zone = TimeZoneField(default='America/New_York',
           help_text=_("Default time zone to display times in."))

    admins = models.ManyToManyField(settings.AUTH_USER_MODEL)

    def safe_description(self):
        return sanitize(self.description)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Series")
        verbose_name_plural = _("Series")

# Create your models here.
class Plenary(models.Model):
    series = models.ForeignKey(Series, on_delete=models.CASCADE, blank=True, null=True)
    name = models.CharField(max_length=100)
    slug = models.SlugField(help_text=_("Short name for URL"))
    organizer = models.CharField(max_length=100, default="", blank=True)
    image = models.ImageField(upload_to="plenaries", blank=True, null=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    time_zone = TimeZoneField(default='America/New_York',
        help_text=_("Default time zone to display times in."))
    public = models.BooleanField(default=False,
        help_text=_("Check to display this plenary on the public events list"))
    description = models.TextField(default="", blank=True,)
    whiteboard = models.TextField(default="", blank=True)
    breakout_mode = models.CharField(max_length=20, choices=(
        ("admin", _("Admin controlled")),
        ("user", _("Participant proposed")),
        ("random", _("Random breakouts"))
    ), default="admin")
    random_max_attendees = models.IntegerField(default=10, validators=[
        MinValueValidator(2),
        MaxValueValidator(10),
    ])

    embeds = JSONField(blank=True, null=True)
    history = JSONField(blank=True, null=True)
    open = models.BooleanField(default=False,
            help_text=_("Check to allow people to chat in this plenary"))
    breakouts_open = models.BooleanField(default=False,
            help_text=_("Check to allow people to join breakouts associated with this plenary"))

    admins = models.ManyToManyField(settings.AUTH_USER_MODEL)

    @property
    def channel_group_name(self):
        return "plenary-%s" % self.pk

    def safe_description(self):
        return sanitize(self.description) if self.description else ""

    def safe_whiteboard(self):
        return sanitize(self.whiteboard) if self.whiteboard else ""

    def get_absolute_url(self):
        return reverse("plenary_detail", kwargs={'id_or_slug': self.slug})

    def serialize(self):
        return {
            'plenary': {
                'series_name': self.series and self.series.name,
                'name': self.name,
                'slug': self.slug,
                'url': self.get_absolute_url(),
                'organizer': self.organizer,
                'image': self.image.url if self.image else None,
                'start_date': self.start_date.isoformat(),
                'end_date': self.end_date.isoformat(),
                'time_zone': str(self.time_zone),
                'public': self.public,
                'description': self.safe_description(),
                'whiteboard': self.safe_whiteboard(),
                'breakout_mode': self.breakout_mode,
                'embeds': self.embeds,
                'history': self.history,
                'open': self.open,
                'breakouts_open': self.breakouts_open,
                'admins': [admin.username for admin in self.admins.all()],
                'video_sync_id': self.channel_group_name,
            },
            'breakouts': [breakout.serialize() for breakout in self.breakout_set.all()],
            'chat_messages': [msg.serialize() for msg in self.chatmessage_set.all()],
        }

    def has_admin(self, user):
        return self.admins.filter(pk=user.pk).exists()

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Plenary")
        verbose_name_plural = _("Plenaries")

class ChatMessage(models.Model):
    plenary = models.ForeignKey(Plenary)
    user = models.ForeignKey(settings.AUTH_USER_MODEL)
    created = models.DateTimeField(auto_now_add=True)
    message = models.TextField(default="", blank=True)
    highlight = models.BooleanField(default=False)

    def safe_message(self):
        return self.message

    def __str__(self):
        return "%s: %s" % (self.user, self.message)

    def serialize(self):
        return {
            'user': self.user.serialize_public(),
            'created': self.created.isoformat(),
            'message': self.safe_message(),
            'highlight': self.highlight,
        }

    class Meta:
        ordering = ['created']
        verbose_name = _("Chat message")
        verbose_name_plural = _("Chat messages")
