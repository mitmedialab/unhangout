from django.conf.urls import url, include

from breakouts import views

urlpatterns = [
    url(r'^breakout/(?P<breakout_id>\d+)/$', views.breakout_detail, name='breakout_detail'),
]
