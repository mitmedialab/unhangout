from django.db import models

# Create your models here.
class PageComponent(models.Model):
    key = models.CharField(max_length=255, unique=True)
    title = models.CharField(max_length=255, blank=True,
            help_text='Optional page title; used when component represents a full page (e.g. terms/license)')
    html = models.TextField()

    def __str__(self):
        return self.key
