import re

from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils.translation import ugettext_lazy as _
from django.utils.timezone import now
from richtext.utils import sanitize
from reunhangout.utils import random_webrtc_id

from jsonfield import JSONField
from timezone_field import TimeZoneField
import iso8601

class Series(models.Model):
    slug = models.SlugField(help_text="Short name for URL")

    def __str__(self):
        return self.slug

    class Meta:
        verbose_name = _("Series")
        verbose_name_plural = _("Series")

def get_etherpad_default_text():
    return settings.ETHERPAD_DEFAULT_TEXT

# Create your models here.
class Plenary(models.Model):
    series = models.ForeignKey(Series, on_delete=models.CASCADE, blank=True, null=True)
    name = models.CharField(max_length=100)
    slug = models.SlugField(help_text=_("Short name for URL"), unique=True)
    max_participants = models.PositiveIntegerField(default=100,
            help_text="Maximum number of connections. Set to 0 for no limit.")
    organizer = models.CharField(max_length=100, default="", blank=True)
    image = models.ImageField(upload_to="plenaries", blank=True, null=True)

    start_date  = models.DateTimeField(help_text=_("When will the event start?"))
    doors_open  = models.DateTimeField(help_text=_("When should the lobby be opened, allowing participants to chat before the event?"))
    end_date    = models.DateTimeField(help_text=_("When will the event end?"))
    doors_close = models.DateTimeField(help_text=_("When should the lobby be closed, ending chat?"))
    wrapup_emails = models.BooleanField(default=False, help_text=_(
        "Enable wrap-up emails? Enabling will require participants "
        "to set their contact preferences. Wrap-up emails can only "
        "be initiated by Unhangout staff."
    ))
    canceled = models.BooleanField(default=False)

    time_zone = TimeZoneField(default='America/New_York',
        help_text=_("Default time zone to display times in."))
    public = models.BooleanField(default=False,
        help_text=_("Check to display this plenary on the public events list"))
    description = models.TextField(default="", blank=True,)

    whiteboard = models.TextField(
        default="Welcome to our unhangout! Say hi 👋 in the chat.",
        blank=True)

    etherpad_initial_text = models.TextField(
        default=get_etherpad_default_text,
        blank=True, null=True)

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
    jitsi_server = models.CharField(max_length=255, choices=(
        [(a,a) for a in settings.JITSI_SERVERS]
    ), default=settings.JITSI_SERVERS[0])

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
        if re.match('^[0-9]+$', self.slug) and int(self.slug) != self.id:
            raise ValidationError("Slug must contain at least one letter")
        if self.start_date >= self.end_date:
            raise ValidationError("End date must be after start date")
        if self.doors_open > self.start_date:
            raise ValidationError("Doors open must be before or equal to start date")
        if self.doors_close < self.end_date:
            raise ValidationError("Doors close must be after or equal to end date")

    def serialize(self):
        return {
            'admins': [a.serialize_public() for a in self.admins.all()],
            'breakout_mode': self.breakout_mode,
            'breakouts_open': self.breakouts_open,
            'canceled': self.canceled,
            'description': self.safe_description(),
            'doors_close': self.doors_close.isoformat(),
            'doors_open': self.doors_open.isoformat(),
            'embeds': self.embeds,
            'end_date': self.end_date.isoformat(),
            'etherpad_initial_text': self.etherpad_initial_text,
            'history': self.history,
            'id': self.id,
            'image': self.image.url if self.image else None,
            'live_participants': list(self.live_participants.values_list('id', flat=True)),
            'max_participants': self.max_participants,
            'name': self.name,
            'open': self.open,
            'organizer': self.organizer,
            'public': self.public,
            'slug': self.slug,
            'start_date': self.start_date.isoformat(),
            'time_zone': str(self.time_zone),
            'url': self.get_absolute_url(),
            'video_sync_id': self.channel_group_name,
            'webrtc_id': self.webrtc_id,
            'whiteboard': self.safe_whiteboard(),
            'wrapup_emails': self.wrapup_emails,
        }


    def associated_users(self):
        """
        Get all users associated with the plenary. We need to take care in this
        query as the performance can blow out of proportion.  This is the
        original way we tried this, which builds a stack of LEFT OUTER JOIN's
        and blew up into >40s query time:

        plenary_users = User.objects.filter(
            models.Q(plenary=self) | # admins
            models.Q(presence__room__channel_name__in=channels) |
            models.Q(mentioned_chats__plenary=self) |
            models.Q(chatmessage__plenary=self) |
            models.Q(plenaries_participating_live=self) |
            models.Q(member_of_breakouts__id__in=breakout_ids) |
            models.Q(voted_on_breakouts__id__in=breakout_ids) |
            models.Q(proposed_breakouts__id__in=breakout_ids)
        ).order_by('id').distinct('id')

        Corresponding SQL:

        => SELECT DISTINCT (...)
        -> FROM "accounts_user"
        -> LEFT OUTER JOIN "plenaries_plenary_admins"
        ->      ON ("accounts_user"."id" = "plenaries_plenary_admins"."user_id")
        -> LEFT OUTER JOIN "channels_presence_presence"
        ->      ON ("accounts_user"."id" = "channels_presence_presence"."user_id")
        -> LEFT OUTER JOIN "channels_presence_room"
        ->      ON ("channels_presence_presence"."room_id" = "channels_presence_room"."id")
        -> LEFT OUTER JOIN "plenaries_chatmessage_mentions"
        ->      ON ("accounts_user"."id" = "plenaries_chatmessage_mentions"."user_id")
        -> LEFT OUTER JOIN "plenaries_chatmessage"
        ->      ON ("plenaries_chatmessage_mentions"."chatmessage_id" =
        ->        ->"plenaries_chatmessage"."id")
        -> LEFT OUTER JOIN "plenaries_chatmessage" T9
        ->      ON ("accounts_user"."id" = T9."user_id")
        -> LEFT OUTER JOIN "plenaries_plenary_live_participants"
        ->      ON ("accounts_user"."id" = "plenaries_plenary_live_participants"."user_id")
        -> LEFT OUTER JOIN "breakouts_breakout_members"
        ->      ON ("accounts_user"."id" = "breakouts_breakout_members"."user_id")
        -> LEFT OUTER JOIN "breakouts_breakout_votes"
        ->      ON ("accounts_user"."id" = "breakouts_breakout_votes"."user_id")
        -> LEFT OUTER JOIN "breakouts_breakout" T17
        ->      ON ("accounts_user"."id" = T17."proposed_by_id")
        -> WHERE ("plenaries_plenary_admins"."plenary_id" = 1104 OR
        ->   "channels_presence_room"."channel_name" IN (
        ->       'breakout-198', 'breakout-199', 'breakout-200', 'breakout-201',
        ->       'plenary-154'
        ->   ) OR
        ->   "plenaries_chatmessage"."plenary_id" = 154 OR
        ->   T9."plenary_id" = 154 OR
        ->   "plenaries_plenary_live_participants"."plenary_id" = 154 OR
        ->   "breakouts_breakout_members"."breakout_id" IN (198, 199, 200, 201) OR
        ->   "breakouts_breakout_votes"."breakout_id" IN (198, 199, 200, 201) OR
        ->   T17."id" IN (198, 199, 200, 201))
        -> ORDER BY "accounts_user"."id" ASC;


        The present strategy is based on replacing all those joins with
        subqueries, which is WAY more efficient in postgres. This is the target
        SQL:

        => SELECT DISTINCT ON ("accounts_user"."id")
        ->   "accounts_user"."id"
        -> FROM "accounts_user"
        -> WHERE
        ->   "accounts_user"."id" IN (
        ->       SELECT "channels_presence_presence"."user_id"
        ->       FROM "channels_presence_presence"
        ->       INNER JOIN "channels_presence_room"
        ->        ->ON ("channels_presence_presence"."room_id" =
        ->        ->    "channels_presence_room"."id")
        ->       WHERE "channels_presence_room"."channel_name" IN (
        ->        ->'breakout-198', 'breakout-199', 'breakout-200',
        ->        ->'breakout-201', 'plenary-154'
        ->      )
        ->   ) OR
        ->   "accounts_user"."id" IN (
        ->      SELECT "user_id" FROM "plenaries_plenary_admins"
        ->      WHERE "plenaries_plenary_admins"."plenary_id" = 154) OR
        ->   "accounts_user"."id" IN (
        ->       SELECT "plenaries_chatmessage_mentions"."user_id"
        ->       FROM "plenaries_chatmessage_mentions"
        ->       INNER JOIN "plenaries_chatmessage"
        ->        ->ON ("plenaries_chatmessage_mentions"."chatmessage_id" =
        ->        ->    "plenaries_chatmessage"."id")
        ->       WHERE "plenaries_chatmessage"."plenary_id" = 154
        ->   ) OR
        ->   "accounts_user"."id" IN (
        ->       SELECT "plenaries_chatmessage"."user_id"
        ->       FROM "plenaries_chatmessage"
        ->       WHERE "plenaries_chatmessage"."plenary_id" = 154) OR
        ->   "accounts_user"."id" IN (
        ->       SELECT "user_id"
        ->       FROM "plenaries_plenary_live_participants"
        ->       WHERE "plenaries_plenary_live_participants"."plenary_id" = 154) OR
        ->   "accounts_user"."id" IN (
        ->       SELECT "user_id"
        ->       FROM "breakouts_breakout_members"
        ->       WHERE "breakouts_breakout_members"."breakout_id" IN (198, 199, 299, 291)) OR
        ->   "accounts_user"."id" IN (
        ->       SELECT "user_id"
        ->       FROM "breakouts_breakout_votes"
        ->       WHERE "breakouts_breakout_votes"."breakout_id" IN (198, 199, 299, 291)) OR
        ->   "accounts_user"."id" IN (
        ->       SELECT "proposed_by_id"
        ->       FROM "breakouts_breakout"
        ->       WHERE "breakouts_breakout"."id" IN (198, 199, 200, 201))
        -> ORDER BY "accounts_user"."id" ASC;
        """
        from breakouts.models import Breakout
        from channels_presence.models import Presence
        User = get_user_model()
        breakout_ids = list(self.breakout_set.active().values_list(
            'id', flat=True))
        channels = [Breakout.channel_group_name_from_id(pk) for pk in breakout_ids]
        channels.append(self.channel_group_name)

        subqueries = [
            # Presence in plenary or breakouts
            Presence.objects.filter(room__channel_name__in=channels).values_list('user_id'),
            # Admins
            self.admins.through.objects.filter(plenary=self).values_list('user_id'),
            # Mentions
            ChatMessage.mentions.through.objects.filter(
                chatmessage__plenary=self).values_list('user_id'),
            # Chat message authors
            ChatMessage.objects.filter(plenary=self).values_list('user_id'),
            # Live participants
            self.live_participants.through.objects.filter(plenary=self).values_list('user_id'),
            # Breakout members, voters, and proposers
            Breakout.members.through.objects.filter(breakout_id__in=breakout_ids).values_list('user_id'),
            Breakout.votes.through.objects.filter(breakout_id__in=breakout_ids).values_list('user_id'),
            Breakout.objects.active().filter(
                id__in=breakout_ids
            ).values_list('proposed_by_id'),
        ]

        q = models.Q()
        for subquery in subqueries:
            q = q | models.Q(id__in=subquery)
        users = User.objects.filter(q).distinct()
        return users

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

    def has_admin(self, user):
        return user.is_superuser or self.admins.filter(pk=user.pk).exists()

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Plenary")
        verbose_name_plural = _("Plenaries")

class ChatMessage(models.Model):
    plenary = models.ForeignKey(Plenary, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)
    message = models.TextField(default="", blank=True)
    highlight = models.BooleanField(default=False)
    archived = models.BooleanField(default=False)
    mentions = models.ManyToManyField(settings.AUTH_USER_MODEL,
            related_name="mentioned_chats")

    def safe_message(self):
        return sanitize(self.message, tags=['b', 'i', 'span', 'p', 'br'])

    def __str__(self):
        return "%s: %s" % (self.user, self.message)

    def serialize(self):
        return {
            'id': self.id,
            'user': self.user_id,
            'created': self.created.isoformat(),
            'message': self.safe_message(),
            'highlight': self.highlight,
            'archived': self.archived,
            'mentions': [m.id for m in self.mentions.all()]
        }

    class Meta:
        ordering = ['created']
        verbose_name = _("Chat message")
        verbose_name_plural = _("Chat messages")
