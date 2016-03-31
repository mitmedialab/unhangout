from django.db import models
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils.translation import ugettext_lazy as _
from jsonfield import JSONField

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

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self.pk
        super(Breakout, self).save(*args, **kwargs)

    def __str__(self):
        return self.title
