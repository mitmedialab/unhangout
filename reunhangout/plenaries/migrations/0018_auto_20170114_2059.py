# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2017-01-14 20:59
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('plenaries', '0017_chatmessage_archived'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='series',
            name='admins',
        ),
        migrations.RemoveField(
            model_name='series',
            name='description',
        ),
        migrations.RemoveField(
            model_name='series',
            name='end_date',
        ),
        migrations.RemoveField(
            model_name='series',
            name='image',
        ),
        migrations.RemoveField(
            model_name='series',
            name='name',
        ),
        migrations.RemoveField(
            model_name='series',
            name='organizer',
        ),
        migrations.RemoveField(
            model_name='series',
            name='start_date',
        ),
        migrations.RemoveField(
            model_name='series',
            name='time_zone',
        ),
    ]