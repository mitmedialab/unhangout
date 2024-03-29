# -*- coding: utf-8 -*-
# Generated by Django 1.11.3 on 2017-08-31 17:03
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_auto_20170831_1702'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='share_email',
            field=models.BooleanField(default=False, help_text='Share your email address with others who participate in events with you?'),
        ),
    ]
