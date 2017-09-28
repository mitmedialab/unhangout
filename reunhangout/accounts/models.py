import json
import logging

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin, AnonymousUser
from django.contrib.sites.models import Site
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from django.db import models, transaction
from django.utils.translation import ugettext_lazy as _
from django.utils import timezone

from accounts import email_handlers

from django_gravatar.helpers import get_gravatar_url
from sorl.thumbnail import get_thumbnail
from jsonfield import JSONField
import requests

logger = logging.getLogger()

class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **kwargs):
        user = self.model(username=username, **kwargs)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, username, password, **kwargs):
        user = self.create_user(username, password, **kwargs)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        return user


def serialize_public(user):
    if isinstance(user, AnonymousUser):
        # TODO: uniqify this somehow
        return {
            'username': 'Anonymous',
            'display_name': 'Anonymous',
            'image': User.default_profile_image(),
        }
    else:
        return {
            'id': user.id,
            'username': user.username,
            'display_name': user.get_display_name(),
            'image': user.get_profile_image(),
            'contact_card_twitter': user.contact_card_twitter,
            'contact_card_email': user.contact_card_email,
        }

def user_display(user):
    return user.get_display_name()

class User(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=30, unique=True,
            error_messages={'unique': "An account with that username already exists."},
            help_text="Unique name to log in with")
    email = models.EmailField("Email address", blank=True, null=True,
            unique=True, default=None)
    display_name = models.CharField(max_length=30, blank=True,
            help_text="Name to display publicly in chat and lists")
    profile_image = models.ImageField(upload_to="profile_images",
            blank=True, null=True)

    # Wrap up email details
    receive_wrapup_emails = models.NullBooleanField(null=True,
            help_text=_("Receive wrap-up emails after events?"))
    contact_card_email = models.EmailField(blank=True, null=True,
            help_text=_("Shared with co-participants in events"))
    contact_card_twitter = models.CharField(max_length=100, blank=True, null=True,
            unique=True, default=None,
            help_text=_("Shared with co-participants in events"))

    # Account management
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into this admin site.'),
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email'] # Used only by createsuperuser management command

    def save(self, *args, **kwargs):
        if not self.email:
            self.email = None
        return super(User, self).save(*args, **kwargs)

    def clean(self):
        super().clean()
        if self.email:
            self.email = UserManager.normalize_email(self.email)
        if self.contact_card_email:
            self.contact_card_email = UserManager.normalize_email(
                    self.contact_card_email)
        if self.contact_card_twitter:
            handle = self.contact_card_twitter.lower()
            if not handle.startswith('@'):
                handle = '@' + handle
            self.contact_card_twitter = handle

    def serialize_public(self):
        return serialize_public(self)

    def get_short_name(self):
        return self.username

    def get_display_name(self):
        if self.display_name:
            return self.display_name

        cache_key = "display-name-{}".format(self.pk)
        cached = cache.get(cache_key)
        if cached:
            return cached
        else:
            result = self.get_display_name_nocache()
            cache.set(cache_key, result, 60 * 60)
        return result

    def get_display_name_nocache(self):
        if self.display_name:
            return self.display_name

        socialaccounts = {}
        for acct in self.socialaccount_set.all():
            socialaccounts[acct.provider] = acct

        if 'facebook' in socialaccounts:
            name = socialaccounts['facebook'].extra_data.get('name')
            if name:
                return name

        if 'google' in socialaccounts:
            name = socialaccounts['google'].extra_data.get('name')
            if name:
                return name

        if 'twitter' in socialaccounts:
            name = socialaccounts['twitter'].extra_data.get('name')
            if name:
                return name

        return self.username

    def get_profile_image(self):
        if self.profile_image:
            return get_thumbnail(self.profile_image, '64x64', crop='center').url

        cache_key = "profile-image-{}".format(self.pk)
        cached = cache.get(cache_key)
        if cached:
            return cached
        else:
            result = self.get_profile_image_nocache()
            cache.set(cache_key, result, 60 * 60)
        return result

    def get_profile_image_nocache(self):
        if self.profile_image:
            return get_thumbnail(self.profile_image, '64x64', crop='center').url

        socialaccounts = {}
        for acct in self.socialaccount_set.all():
            socialaccounts[acct.provider] = acct

        if 'facebook' in socialaccounts:
            redirect = 'https://graph.facebook.com/{}/picture'.format(acct.uid)
            try:
                res = requests.head(redirect)
            except ConnectionError:
                pass
            else:
                if res.status_code == 302:
                    return res.headers['Location']
        if 'google' in socialaccounts:
            try:
                return acct.extra_data['picture']
            except KeyError:
                pass
        if 'twitter' in socialaccounts:
            try:
                return acct.extra_data['profile_image_url_https']
            except KeyError:
                pass
        if self.email:
            return get_gravatar_url(self.email, size=64, secure=True,
                default=self.default_profile_image())
        return self.default_profile_image()

    @classmethod
    def default_profile_image(cls):
        return "".join((
            "https://",
            Site.objects.get_current().domain,
            settings.MEDIA_URL,
            "assets/default_avatar.jpg"
        ))


    def __str__(self):
        return self.get_display_name()

class EmailNotificationManager(models.Manager):
    def wrapup_email(self, user, plenary, copresence=None, silent=True):
        handler = email_handlers.WrapupEmail(
            user, copresence=copresence, plenary=plenary)
        return self._send(handler, silent)

    def _send(self, handler, silent):
        event_key = handler.get_event_key()
        try:
            return EmailNotification.objects.get(user=handler.user,
                    event_key=event_key)
        except EmailNotification.DoesNotExist:
            pass

        try:
            subject = handler.get_subject()
            assert bool(subject), "Email missing subject"
            with transaction.atomic():
                en = EmailNotification.objects.create(
                    user=handler.user,
                    event_key=event_key,
                    type=handler.type,
                    from_email=handler.get_from_email(),
                    to_email=", ".join(handler.get_to_emails()),
                    subject=subject,
                    body_txt=handler.get_body_txt() or "",
                    body_html=handler.get_body_html() or "",
                )
                en.send(fail_silently=False)
        except Exception:
            logger.exception("Error sending from {}".format(handler))
            if not silent:
                raise

class EmailNotification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    event_key = models.CharField(max_length=255)
    type = models.CharField(max_length=50, choices=(
        ('wrapup_email', 'Wrapup Email'),
    ))
    from_email = models.EmailField()
    to_email = models.CharField(max_length=255,
        help_text="Comma separated list of email addresses")
    subject = models.TextField()
    body_txt = models.TextField()
    body_html = models.TextField()
    created = models.DateTimeField(default=timezone.now)

    # Tracking
    sent = models.BooleanField(default=False)
    delivered = models.NullBooleanField(default=None)
    opens = JSONField(default=list)
    clicks = JSONField(default=list)
    deliveries = JSONField(default=list)
    failures = JSONField(default=list)

    objects = EmailNotificationManager()

    def send(self, fail_silently=False, allow_resend=False):
        assert bool(self.id), "Can't send unsaved EmailNotification"
        if not allow_resend:
            assert not self.sent, "EmailNotification has already been sent"
        track_clicks_opens = "yes" if bool(self.body_html) else "no"

        # Like 'send_email' wrapper, but with our custom headers
        mail = EmailMultiAlternatives(
            subject=self.subject,
            body=self.body_txt,
            from_email=self.from_email,
            to=self.to_email.split(", "),
            headers={
                "X-Mailgun-Variables": json.dumps({
                    "email_notification_id": self.id
                }),
                "X-Mailgun-Track": "yes",
                "X-Mailgun-Track-Clicks": track_clicks_opens,
                "X-Mailgun-Track-Opens": track_clicks_opens,
            }
        )
        if self.body_html:
            mail.attach_alternative(self.body_html, "text/html")

        mail.send(fail_silently=fail_silently)
        self.sent = True
        self.save()

    class Meta:
        unique_together = [('user', 'event_key')]

    def __str__(self):
        return "%s: %s, %s" % (self.type, self.to_email, self.created)

