# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2016-12-18 21:12
from __future__ import unicode_literals

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('breakouts', '0008_remove_breakout_is_hoa'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='breakout',
            options={'ordering': ['created']},
        ),
        migrations.AddField(
            model_name='breakout',
            name='created',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
