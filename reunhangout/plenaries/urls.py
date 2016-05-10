from django.conf import settings
from django.conf.urls import url, include

from plenaries import views

urlpatterns = [
    url(r'^event/(?P<id_or_slug>[-a-z0-9]+)/$', views.plenary_detail,
        name='plenary_detail'),
    url(r'^events/$', views.plenary_list,
        name='plenary_list')
]
