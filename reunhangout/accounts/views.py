import re
import hashlib
import hmac
import logging

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import logout
from django.contrib import messages
from django.db import transaction
from django.http import Http404, HttpResponse, HttpResponseBadRequest
from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.utils.translation import ugettext_lazy as _
from django.views.decorators.csrf import csrf_exempt

from accounts import settings_panel, email_handlers
from accounts.forms import AccountSettingsForm
from accounts.models import User, EmailNotification
from allauth.account.views import EmailView as AllauthEmailView
from allauth.socialaccount.views import ConnectionsView as AllauthConnectionsView

logger = logging.getLogger('django.request')

@login_required
def profile(request):
    return render(request, 'accounts/profile.html')

@login_required
def account_settings(request, slug=None):
    """
    Dispatch to a settings panel that has been registered with the given slug.
    """
    if not slug:
        return redirect('accounts_settings', settings_panel.get_default_slug())

    view = settings_panel.get_view(slug)
    name = settings_panel.get_name(slug)
    if not view:
        raise Http404
    return view(request, slug=slug, name=name)

class AccountSettings(settings_panel.BaseSettingsPanelView):
    template_name = "accounts/account_settings_panel.html"
    def get_form(self):
        return AccountSettingsForm(
            self.request.POST or None,
            self.request.FILES or None,
            instance=self.request.user
        )

    def form_valid(self, form):
        form.save()
        return super(AccountSettings, self).form_valid(form)
settings_panel.register(AccountSettings, "account", _("Account"))

class EmailView(AllauthEmailView, settings_panel.BaseSettingsPanelView):
    template_name = "accounts/email_settings_panel.html"
    success_url = reverse_lazy("accounts_settings", args=["email"])
settings_panel.register(EmailView, "email", _("Email"))

class ConnectionsView(AllauthConnectionsView, settings_panel.BaseSettingsPanelView):
    template_name = "accounts/connections_settings_panel.html"
    success_url = reverse_lazy("accounts_settings", args=["connections"])
    def get_success_url(self):
        return self.success_url
settings_panel.register(ConnectionsView, "connections", _("Connections"))

@login_required
def delete_account(request):
    user = request.user
    if request.method == "POST":
        logout(request)
        user.delete()
        messages.info(request, "Your account has been deleted.")
        return redirect("/")

    return render(request, "accounts/delete_account.html")

class CancelTransaction(Exception):
    pass

@login_required
def email_preview(request):
    if not request.user.is_superuser:
        raise Http404

    slug = request.GET.get('slug')
    html_index = request.GET.get('index')
    if html_index is not None:
        html_index = int(html_index)

    slugs = [
        ("wrapup-email", "Wrapup Email")
    ]
    slugs_dict = dict(slugs)
    if not slug:
        slug = "wrapup-email"
        #return render(request, "accounts/email_preview_index.html", {'slugs': slugs})
    elif slug not in slugs_dict:
        raise Http404

    try:
        with transaction.atomic():
            emails = []

            if slug == "wrapup-email":
                from plenaries.tests import attended_plenary
                plenary, b1, b2, b3, u1, u2, u3, u4, u5 = attended_plenary()
                emails.append({
                    'title': "Wrapup Email",
                    'variant': '',
                    'handler': email_handlers.WrapupEmail(
                        user=u1,
                        plenary=plenary
                    )
                })

            for i, email in enumerate(emails):
                email['index'] = str(i)
            if html_index:
                emails = emails[html_index:html_index+1]
            response = render(request, "accounts/email_preview.html", {
                'emails': emails,
                'html_only': html_index is not None,
                'slug': slug,
                'slug_title': slugs_dict[slug]
            })
            raise CancelTransaction()
    except CancelTransaction:
        pass
    return response


def _verify_mailgun_hmac(request):
    token = request.POST.get('token', '')
    timestamp = request.POST.get('timestamp', '')
    signature = request.POST.get('signature', '')
    hmac_digest = hmac.new(
        key=settings.MAILGUN_ACTIVE_API_KEY.encode('utf-8'),
        msg='{}{}'.format(timestamp, token).encode('utf-8'),
        digestmod=hashlib.sha256).hexdigest()
    return hmac.compare_digest(str(signature), str(hmac_digest))

class MailgunRefusalResponse(HttpResponse):
    # Instructs mailgun not to retry the request.
    status_code = 406


@csrf_exempt
def mailgun_webhook(request):
    if request.method != "POST":
        return HttpResponseBadRequest()
    if not _verify_mailgun_hmac(request):
        logger.error("Invalid mailgun hmac. {}".format(dict(request.POST)))
        return HttpResponseBadRequest()

    email_notification_id = request.POST.get("email_notification_id")
    try:
        en = EmailNotification.objects.get(pk=email_notification_id)
    except EmailNotification.DoesNotExist:
        return MailgunRefusalResponse()

    event = request.POST.get('event')
    ua_params = [
        "country",
        "region",
        "city",
        "user-agent",
        "device-type",
        "client-name",
        "client-os",
        "timestamp",
    ]
    if event == 'opened':
        en.opens.append({k: request.POST.get(k) for k in ua_params})
        en.delivered = True
    elif event == "clicked":
        en.clicks.append({k: request.POST.get(k) for k in ua_params + ["url"]})
        en.delivered = True
    elif event == "dropped":
        en.failures.append({k: request.POST.get(k) for k in [
            'event', 'reason', 'code', 'description', 'timestamp'
        ]})
        en.delivered = False
    elif event == "bounced":
        en.failures.append({k: request.POST.get(k) for k in [
            'event', 'code', 'error', 'notification', 'timestamp'
        ]})
        en.delivered = False
    elif event == "delivered":
        en.deliveries.append({k: request.POST.get(k) for k in ['timestamp']})
        en.delivered = True
    else:
        # ignore others
        return HttpResponse()

    en.save()
    return HttpResponse()
