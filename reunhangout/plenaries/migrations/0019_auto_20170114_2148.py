# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2017-01-14 21:48
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('plenaries', '0018_auto_20170114_2059'),
    ]

    operations = [
        migrations.AlterField(
            model_name='plenary',
            name='slug',
            field=models.SlugField(help_text='Short name for URL', unique=True),
        ),
    ]
