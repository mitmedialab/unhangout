import logging

from celery import shared_task
from accounts.models import User, EmailNotification
from analytics.models import Action
from plenaries.models import Plenary

logger = logging.getLogger('request')

@shared_task(name='plenaries.tasks.wrapup_emails')
def wrapup_emails(plenary_ids):
    plenaries = Plenary.objects.filter(id__in=plenary_ids)
    for plenary in plenaries:
        copresence = Action.objects.breakout_copresence(plenary)
        recipients = (
            plenary.associated_users() |
            User.objects.filter(
                id__in=Action.objects.filter(plenary=plenary).values_list(
                    'user_id')).distinct()
        ).filter(
            receive_wrapup_emails=True,
            email__isnull=False
        ).distinct()

        for user in recipients:
            if not copresence.get(user.id):
                continue
            try:
                EmailNotification.objects.wrapup_email(
                    user,
                    plenary=plenary,
                    copresence=copresence,
                    silent=False
                )
            except Exception as e:
                logger.exception(e)
                continue
