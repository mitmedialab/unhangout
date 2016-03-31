from django.contrib import admin

from plenaries.models import Plenary, Series
from richtext.utils import RichTextualizedModelForm

# Register your models here.
@admin.register(Plenary)
class PlenaryAdmin(admin.ModelAdmin):
    #form = RichTextualizedModelForm
    list_display = ['name', 'organizer', 'open']
    list_editable = ['open']
    search_fields = ['name', 'organizer', 'description']
    prepopulated_fields = {'slug': ['name']}
    readonly_fields = ['embeds', 'history']
    filter_horizontal = ['admins']

@admin.register(Series)
class SeriesAdmin(admin.ModelAdmin):
    form = RichTextualizedModelForm
    list_display = ['name', 'organizer', 'start_date', 'end_date']
    search_fields = ['name', 'organizer', 'description']
    prepopulated_fields = {'slug': ['name']}
    filter_horizontal = ['admins']
