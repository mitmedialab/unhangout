# -*- coding: utf-8 -*-
# Generated by Django 1.11.3 on 2020-04-20 18:22
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('breakouts', '0015_breakout_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='breakout',
            name='enable_speaker_stats',
            field=models.BooleanField(default=False),
        ),
    ]
