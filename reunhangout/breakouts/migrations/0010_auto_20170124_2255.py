# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2017-01-24 22:55
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('breakouts', '0009_auto_20161218_2112'),
    ]

    operations = [
        migrations.AlterField(
            model_name='breakout',
            name='title',
            field=models.CharField(blank=True, default='', max_length=80),
        ),
    ]