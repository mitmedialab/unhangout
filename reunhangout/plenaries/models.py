import re

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.urlresolvers import reverse
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils.translation import ugettext_lazy as _
from django.utils.timezone import now
from richtext.utils import sanitize
from reunhangout.utils import random_webrtc_id

from jsonfield import JSONField
from timezone_field import TimeZoneField
import iso8601

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

    start_date  = models.DateTimeField(help_text=_("When will the event start?"))
    doors_open  = models.DateTimeField(help_text=_("When should the lobby be opened, allowing participants to chat before the event?"))
    end_date    = models.DateTimeField(help_text=_("When will the event end?"))
    doors_close = models.DateTimeField(help_text=_("When should the lobby be closed, ending chat?"))
    canceled = models.BooleanField(default=False)

    time_zone = TimeZoneField(default='America/New_York',
        help_text=_("Default time zone to display times in."))
    public = models.BooleanField(default=False,
        help_text=_("Check to display this plenary on the public events list"))
    description = models.TextField(default="", blank=True,)
    whiteboard = models.TextField(default="", blank=True, max_length=800)
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

    breakouts_open = models.BooleanField(default=False, help_text=_(
        "Check to allow people to join breakouts associated with this plenary"))

    webrtc_id = models.CharField(max_length=100, default=random_webrtc_id,
            editable=False, unique=True)

    live_participants = models.ManyToManyField(settings.AUTH_USER_MODEL,
            related_name='plenaries_participating_live', blank=True)
    admins = models.ManyToManyField(settings.AUTH_USER_MODEL)

    def clean(self):
        if self.slug:
            self.slug = self.slug.lower()
        for key in ["start_date", "end_date", "doors_open", "doors_close"]:
            date = getattr(self, key)
            if isinstance(date, str):
                try:
                    setattr(self, key, iso8601.parse_date(date))
                except iso8601.ParseError:
                    raise ValidationError("%s: date format not understood" % key)
        if re.match('^[0-9]+$', self.slug):
            raise ValidationError("Slug must contain at least one letter")
        if self.start_date >= self.end_date:
            raise ValidationError("End date must be after start date")
        if self.doors_open > self.start_date:
            raise ValidationError("Doors open must be before or equal to start date")
        if self.doors_close < self.end_date:
            raise ValidationError("Doors close must be after or equal to end date")

    @property
    def channel_group_name(self):
        return "plenary-%s" % self.pk

    @property
    def open(self):
        n = now()
        return (not self.canceled) and (n < self.doors_close) and (n >= self.doors_open)

    def safe_description(self):
        return sanitize(self.description) if self.description else ""

    def safe_whiteboard(self):
        return sanitize(self.whiteboard) if self.whiteboard else ""

    def get_absolute_url(self):
        return reverse("plenary_detail", kwargs={'id_or_slug': self.slug})

    def serialize(self):
        return {
            'id': self.id,
            'series_name': self.series and self.series.name,
            'name': self.name,
            'slug': self.slug,
            'url': self.get_absolute_url(),
            'organizer': self.organizer,
            'image': self.image.url if self.image else None,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'doors_open': self.doors_open.isoformat(),
            'doors_close': self.doors_close.isoformat(),
            'canceled': self.canceled,
            'time_zone': str(self.time_zone),
            'public': self.public,
            'description': self.safe_description(),
            'whiteboard': self.safe_whiteboard(),
            'breakout_mode': self.breakout_mode,
            'embeds': self.embeds,
            'history': self.history,
            'open': self.open,
            'breakouts_open': self.breakouts_open,
            'admins': [username for username in
                self.admins.values_list('username', flat=True)],
            'live_participants': [username for username in
                self.live_participants.values_list('username', flat=True)],
            'video_sync_id': self.channel_group_name,
            'webrtc_id': self.webrtc_id,
        }

    def has_admin(self, user):
        return user.is_superuser or self.admins.filter(pk=user.pk).exists()

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
        return sanitize(self.message, tags=['b', 'i'])

    def __str__(self):
        return "%s: %s" % (self.user, self.message)

    def serialize(self):
        return {
            'id': self.id,
            'user': self.user.serialize_public(),
            'created': self.created.isoformat(),
            'message': self.safe_message(),
            'highlight': self.highlight,
        }

    class Meta:
        ordering = ['created']
        verbose_name = _("Chat message")
        verbose_name_plural = _("Chat messages")
