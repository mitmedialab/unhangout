from django.conf.urls import url

from frontend import views

urlpatterns = [
    url("^$", views.index, name="home"),
    url("^about/$", views.about, name="about"),
]
