from django.conf.urls import url, include

from accounts import views

urlpatterns = [
    url("^profile/$", views.profile, name="accounts_profile"),
    url("^settings/$", views.settings, name="accounts_settings"),
    url("", include("registration.backends.hmac.urls")),
    url("", include("registration.auth_urls")),
]
