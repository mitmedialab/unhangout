# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2016-09-30 20:46
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_auto_20160825_0000'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='display_name',
            field=models.CharField(blank=True, max_length=30),
        ),
    ]
