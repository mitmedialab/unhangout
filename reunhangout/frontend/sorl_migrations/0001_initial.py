# -*- coding: utf-8 -*-
# Generated by Django 1.9.4 on 2016-03-31 00:17
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='KVStore',
            fields=[
                ('key', models.CharField(db_column='key', max_length=200, primary_key=True, serialize=False)),
                ('value', models.TextField()),
            ],
        ),
    ]
