# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2016-10-03 21:36
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('breakouts', '0007_auto_20160905_2248'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='breakout',
            name='is_hoa',
        ),
    ]
