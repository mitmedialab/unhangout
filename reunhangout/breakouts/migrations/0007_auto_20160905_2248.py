# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2016-09-05 22:48
from __future__ import unicode_literals

from django.db import migrations, models
import reunhangout.utils


class Migration(migrations.Migration):

    dependencies = [
        ('breakouts', '0006_auto_20160905_2247'),
    ]

    operations = [
        migrations.AlterField(
            model_name='breakout',
            name='webrtc_id',
            field=models.CharField(default=reunhangout.utils.random_webrtc_id, editable=False, max_length=100, unique=True),
        ),
    ]
