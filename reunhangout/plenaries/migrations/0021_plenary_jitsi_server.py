# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2017-01-27 18:46
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('plenaries', '0020_chatmessage_mentions'),
    ]

    operations = [
        migrations.AddField(
            model_name='plenary',
            name='jitsi_server',
            field=models.CharField(choices=[('meet.jit.si', 'meet.jit.si'), ('jitsi.unhangout.io', 'jitsi.unhangout.io')], default='meet.jit.si', max_length=255),
        ),
    ]
