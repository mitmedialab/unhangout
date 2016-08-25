from django.contrib import admin
from django import forms

from frontend.models import PageComponent

from richtext.utils import RichTextField

class PageComponentForm(forms.ModelForm):
    html = RichTextField()
    class Meta:
        model = PageComponent
        fields = ['key', 'title', 'html']

@admin.register(PageComponent)
class PageComponentAdmin(admin.ModelAdmin):
    list_display = ['key', 'title']
    search_fields = ['key', 'title', 'html']
    readonly_fields = ['key']
    form = PageComponentForm
