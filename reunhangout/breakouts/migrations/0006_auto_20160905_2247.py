# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2016-09-05 22:47
from __future__ import unicode_literals

from django.db import migrations
from reunhangout.utils import random_webrtc_id

def re_randomize_webrtc_ids(apps, schema_editor):
    Breakout = apps.get_model("breakouts", "Breakout")
    for b in Breakout.objects.all():
        b.webrtc_id = random_webrtc_id()
        b.save()



class Migration(migrations.Migration):

    dependencies = [
        ('breakouts', '0005_auto_20160905_2242'),
    ]

    operations = [
        migrations.RunPython(re_randomize_webrtc_ids)
    ]