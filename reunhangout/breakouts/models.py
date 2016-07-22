from django.db import models
from django.conf import settings
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
    #is_random = models.BooleanField(default=False)


    def safe_description(self):
        return sanitize(self.description)

    def serialize(self):
        return {
            'title': self.title,
            'slug': self.slug,
            'description': self.safe_description(),
            'max_attendees': self.max_attendees,
            'activities': self.activities,
            'history': self.history,
            'plenary': self.plenary.id if self.plenary else None,
            'is_hoa': self.is_hoa,
            'is_proposal': self.is_proposal,
            'google_hangout': self.google_hangout.url if self.google_hangout else None,
            'google_hoa': self.google_hoa,
            'proposed_by': self.proposed_by.serialize_public() if self.proposed_by else None,
            'votes': [v.serialize_public() for v in self.votes.all()]
        }

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = '{}-{}'.format(slugify(self.title), self.pk)
        super(Breakout, self).save(*args, **kwargs)

    def __str__(self):
        return self.title
