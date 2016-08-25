# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2016-08-25 00:00
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_auto_20160808_1706'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='username',
            field=models.CharField(error_messages={'unique': 'An account with that username already exists.'}, max_length=30, unique=True),
        ),
    ]
