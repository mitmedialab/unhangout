from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin, AnonymousUser
from django.contrib.sites.models import Site
from django.core.cache import cache
from django.db import models
from django.utils.translation import ugettext_lazy as _
from django.utils import timezone

from django_gravatar.helpers import get_gravatar_url
from sorl.thumbnail import get_thumbnail
import requests

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
            'username': user.username,
            'display_name': user.get_display_name(),
            'image': user.get_profile_image(),
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

    # TODO: Do something else with these
    twitter_handle = models.CharField(max_length=100, blank=True, null=True,
            unique=True, default=None)
    linkedin_profile = models.CharField(max_length=100, blank=True, null=True,
            unique=True, default=None)
    share_info = models.BooleanField(default=True)

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
        if self.email:
            self.email = UserManager.normalize_email(self.email)
        if self.twitter_handle:
            self.twitter_handle = self.twitter_handle.lower()

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
            cache.set(cache_key, result, 60)
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
            cache.set(cache_key, result, 60)
        return result

    def get_profile_image_nocache(self):
        if self.profile_image:
            return get_thumbnail(self.profile_image, '64x64', crop='center').url

        socialaccounts = {}
        for acct in self.socialaccount_set.all():
            socialaccounts[acct.provider] = acct

        if 'facebook' in socialaccounts:
            redirect = 'https://graph.facebook.com/{}/picture'.format(acct.uid)
            res = requests.head(redirect)
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
