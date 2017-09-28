from django.template import TemplateSyntaxError
from django.template.loader import render_to_string
from django.contrib.sites.models import Site
from django.conf import settings

from analytics.models import Action
from breakouts.models import Breakout
from plenaries.models import ChatMessage

class EmailHandler:
    subject_template = None
    body_template_txt = None
    body_tmeplate_html = None
    type = None
    required = []

    def __init__(self, user, **kwargs):
        site = Site.objects.get_current()
        self.user = user
        protocol ="http" if site.domain.startswith("localhost") else "https",
        self.context = {
            'user': user,
            'site': site,
            'protocol': protocol,
            'logo': settings.BRANDING['logo_png'],
        }
        self.context.update(kwargs)
        for key in self.required:
            assert self.context.get(key) is not None, "EmailHandler missing kwarg '%s'" % key

    def get_event_key(self):
        raise NotImplementedError

    def get_to_emails(self):
        return [self.user.email]

    def get_from_email(self):
        return settings.DEFAULT_FROM_EMAIL

    def get_subject(self):
        return render_to_string(self.subject_template, self.context).strip()

    def get_body_txt(self):
        if self.body_template_txt is None:
            return None
        return render_to_string(self.body_template_txt, self.context).strip()

    def get_body_html(self):
        if self.body_template_html is None:
            return None
        html = render_to_string(self.body_template_html, self.context).strip()
        # Raise error on mjml rendering errors. It spits warnings/errors out
        # before the doctype.
        if not html.strip().startswith("<!doctype html"):
            error = html.split("<!doctype")[0]
            raise TemplateSyntaxError(error)
        return html

    def __str__(self):
        try:
            email = ", ".join(self.get_to_emails())
        except Exception:
            email = "ERROR"
        try:
            key = self.get_event_key()
        except Exception:
            key = "ERROR"
        return ", ".join((self.type, email, key))

class WrapupEmail(EmailHandler):
    subject_template = "emails/wrapup_subject.txt"
    #body_template_txt = "emails/wrapup_body.txt"
    body_template_html = "emails/wrapup_body.html"
    type = "wrapup"
    required = ["plenary"]

    def __init__(self, user, copresence=None, **kwargs):
        from accounts.models import User

        super().__init__(user, copresence=copresence, **kwargs)

        plenary = self.context['plenary']
        copresence = self.context.get('copresence')
        if not copresence:
            copresence = Action.objects.breakout_copresence(plenary)

        #
        # Set additional context for participant mentions/breakouts
        #

        # Mentions
        mentioned_user = ChatMessage.mentions.through.objects.filter(
            chatmessage__plenary=plenary,
            user=user
        ).values_list('chatmessage__user__id')
        user_mentioned = ChatMessage.mentions.through.objects.filter(
            chatmessage__plenary=plenary,
            chatmessage__user=user
        ).values_list('user_id')

        # Breakout copresence
        breakout_dict = copresence.get(user.id, {})
        copresent_user_ids = set()
        for breakout_id, user_ids in breakout_dict.items():
            copresent_user_ids |= user_ids

        users = list((
            User.objects.filter(id__in=mentioned_user) |
            User.objects.filter(id__in=user_mentioned) |
            User.objects.filter(id__in=copresent_user_ids)
        ).exclude(
            id=user.id
        ).exclude(
            contact_card_email='',
            contact_card_twitter='',
        ).distinct())
        self.context['user_rows'] = []
        for i in range(0, len(users), 2):
            self.context['user_rows'].append(users[i:i+2])

    def get_event_key(self):
        return "wrapup-{}".format(self.context['plenary'].id)
