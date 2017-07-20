from django.views.generic.edit import FormView
from django.urls import reverse
from django.contrib import messages
from django.shortcuts import redirect

from collections import OrderedDict

# Singleton to store all views that have been registered as settings panels
_registered_settings_views = OrderedDict()

def get_default_slug():
    return next(iter(_registered_settings_views.keys()))

def get_view(slug):
    return _registered_settings_views.get(slug, {}).get('view', None)

def get_name(slug):
    return _registered_settings_views.get(slug, {}).get('name', None)

def register(view, slug, name):
    if hasattr(view, "as_view"):
        view = view.as_view()
    _registered_settings_views[slug] = {'view': view, 'name': name}

class BaseSettingsPanelView(FormView):
    def get_success_url(self):
        return getattr(self, "success_url", None) or self.request.path

    def get_context_data(self, **kwargs):
        context = super(BaseSettingsPanelView, self).get_context_data(**kwargs)
        context['panel_slug'] = self.kwargs.get('slug')
        context['panel_name'] = self.kwargs.get('name')
        context['settings_nav'] = []
        for slug, attrs in _registered_settings_views.items():
            context['settings_nav'].append({
                'url': reverse("accounts_settings", kwargs={'slug': slug}),
                'name': attrs['name'],
                'slug': slug,
            })
        return context

    def form_valid(self, form):
        messages.success(self.request, "Settings updated!")
        return super(BaseSettingsPanelView, self).form_valid(form)
