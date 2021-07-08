from django.core.management.base import BaseCommand, CommandError
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.contrib.sites.models import Site
from django.template.loader import render_to_string
from django.utils import timezone
from django.contrib.auth import get_user_model

import datetime


class Command(BaseCommand):
    help = 'Send email to all recent event hosts'

    def handle(self, *args, **options):
        User = get_user_model()
        admins = User.objects.filter(plenary__start_date__gte=timezone.now() - datetime.timedelta(days=256), plenary__canceled=False)
        print(f'About to send email to {admins.count()} users')

        site = Site.objects.get_current()
        protocol ="http" if site.domain.startswith("localhost") else "https",
        context = {
            'site': site,
            'protocol': protocol,
            'logo': settings.BRANDING['logo_png'],
        }

        subject = render_to_string("emails/transition_subject.txt", context).strip('\n')
        body_html = render_to_string("emails/transition_body.html", context)

        batch_size = 500
        for index in range(0, admins.count(), batch_size):
            mail = EmailMultiAlternatives(
                subject=subject,
                body="",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[settings.DEFAULT_FROM_EMAIL], # not ideal
                bcc=[user.email for user in admins[index:index+batch_size]],
            )
            mail.attach_alternative(body_html, "text/html")
            mail.send()
