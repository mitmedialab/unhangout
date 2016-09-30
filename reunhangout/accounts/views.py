import re
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import logout
from django.contrib import messages
from django.core.urlresolvers import reverse_lazy
from django.shortcuts import render, redirect
from django.http import Http404
from django.utils.translation import ugettext_lazy as _

from accounts import settings_panel
from accounts.forms import AccountSettingsForm
from allauth.account.views import EmailView as AllauthEmailView
from allauth.socialaccount.views import ConnectionsView as AllauthConnectionsView

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
        return success_url
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
