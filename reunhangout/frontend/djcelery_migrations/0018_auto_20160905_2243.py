# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2016-09-05 22:43
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('djcelery', '0017_auto_20160905_2243'),
    ]

    operations = [
        migrations.AlterField(
            model_name='taskmeta',
            name='status',
            field=models.CharField(choices=[('RECEIVED', 'RECEIVED'), ('SUCCESS', 'SUCCESS'), ('REVOKED', 'REVOKED'), ('FAILURE', 'FAILURE'), ('RETRY', 'RETRY'), ('STARTED', 'STARTED'), ('PENDING', 'PENDING')], default='PENDING', max_length=50, verbose_name='state'),
        ),
    ]