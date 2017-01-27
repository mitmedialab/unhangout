from django.conf.urls import url

from frontend import views

urlpatterns = [
    url("^$", views.index, name="home"),
    url("^about/$", views.about, name="about"),
    url("^terms/$", views.terms, name="terms"),
    url("^privacy/$", views.privacy, name="privacy"),
    url("^h/(.*)$", views.permalinks_gone, name='permalinks_gone'),
]
