from django.conf.urls import url

from richtext import views

urlpatterns = [
    url(r'handle-attachment$', views.handle_attachment, name='richtext_handle_attachment')
]
