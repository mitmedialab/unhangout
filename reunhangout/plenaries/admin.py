from django.contrib import admin
from django import forms

from plenaries.models import Plenary, Series
from richtext.utils import RichTextField

class PlenaryForm(forms.ModelForm):
    description = RichTextField()
    whiteboard = RichTextField()

# Register your models here.
@admin.register(Plenary)
class PlenaryAdmin(admin.ModelAdmin):
    form = PlenaryForm
    list_display = ['name', 'organizer', 'open']
    list_editable = ['open']
    search_fields = ['name', 'organizer', 'description']
    prepopulated_fields = {'slug': ['name']}
    readonly_fields = ['embeds', 'history']
    filter_horizontal = ['admins']

class SeriesForm(forms.ModelForm):
    description = RichTextField()

@admin.register(Series)
class SeriesAdmin(admin.ModelAdmin):
    form = SeriesForm
    list_display = ['name', 'organizer', 'start_date', 'end_date']
    search_fields = ['name', 'organizer', 'description']
    prepopulated_fields = {'slug': ['name']}
    filter_horizontal = ['admins']
