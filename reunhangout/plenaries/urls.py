from django.conf import settings
from django.conf.urls import url, include

from plenaries import views

urlpatterns = [
    url(r'^event/(?P<id_or_slug>[-a-z0-9_]+)/$', views.plenary_detail, name='plenary_detail'),
    url(r'^event/(?P<plenary_id>\d+)/chat-messages\.(?P<format>json|csv)',
        views.plenary_export_chat, name='plenary_export_chat'),
    url(r'^event/(?P<plenary_id>\d+)/etherpads$',
        views.plenary_export_etherpads, name='plenary_export_etherpads'),
    url(r'^events/$', views.plenary_list, name='plenary_list'),
    url(r'^events/add/$', views.plenary_add, name='plenary_add'),
    url(r'^events/my/$', views.my_events, name='plenary_my_events'),
    url(r'^slug-check$', views.slug_check, name='plenary_slug_check'),

    url(r'^create-youtube-livestream/(?P<plenary_id>\d+)$',
        views.plenary_create_youtube_livestream,
        name='plenary_create_youtube_livestream'),
    url(r'^youtube-livestream-oauth2-callback$',
        views.plenary_livestream_oauth2_callback,
        name='plenary_livestream_oauth2_callback'),

]
