from django.conf.urls import url, include
from django.shortcuts import redirect

from accounts import views

urlpatterns = [
    url("^profile/$", views.profile, name="accounts_profile"),
    url("^settings/(?P<slug>.+)?/$", views.account_settings, name="accounts_settings"),
    url("delete/$", views.delete_account, name='accounts_delete_account'),
    # Hijack allauth routes that we use as settings panels.
    url('social/connections/$', lambda r: redirect("accounts_settings", "connections")),
    url('email/$', lambda r: redirect('accounts_settings', 'email')),
    url("email-preview", views.email_preview, name='email_preview'),
    url("mailgun$", views.mailgun_webhook),

    url("", include('allauth.urls')),
]
