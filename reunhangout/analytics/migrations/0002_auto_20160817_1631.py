# -*- coding: utf-8 -*-
# Generated by Django 1.9.9 on 2016-08-17 16:31
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('breakouts', '0004_auto_20160727_1728'),
        ('plenaries', '0009_auto_20160810_0015'),
        ('analytics', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='action',
            name='breakout',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='breakouts.Breakout'),
        ),
        migrations.AddField(
            model_name='action',
            name='plenary',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='plenaries.Plenary'),
        ),
    ]
