from django.contrib import admin
from django.http import HttpResponse, Http404
from django import forms
from django.utils.timezone import now

from plenaries.models import Plenary, Series, ChatMessage
from richtext.utils import RichTextField
from analytics.utils import plenary_analytics
from plenaries.utils import zip_exported_etherpads

class PlenaryForm(forms.ModelForm):
    description = RichTextField(required=False)
    whiteboard = RichTextField(required=False)

# Register your models here.
@admin.register(Plenary)
class PlenaryAdmin(admin.ModelAdmin):
    form = PlenaryForm
    list_display = ['name', 'organizer', 'start_date', 'doors_open', 'doors_close']
    search_fields = ['name', 'organizer', 'description']
    prepopulated_fields = {'slug': ['name']}
    readonly_fields = ['embeds', 'history']
    filter_horizontal = ['admins']

    actions = ['analytics_json', 'export_breakout_etherpads']

    def export_breakout_etherpads(self, request, queryset):
        zip_content = zip_exported_etherpads(queryset)
        if zip_content is None:
            raise Http404
        
        response = HttpResponse()
        response['Content-Type'] = 'application/zip'
        response['Content-Disposition'] = "attachment; filename={}".format(
            now().strftime("etherpads-%Y-%m-%d.zip")
        )
        response.write(zip_content)
        return response

    def analytics_json(self, request, queryset):
        response = HttpResponse()
        response['Content-Type'] = 'application/json'
        response['Content-Disposition'] = "attachment; filename={}".format(
            now().strftime("analytics-%Y-%m-%d.json")
        )
        response.write(plenary_analytics(queryset, fmt='json'))
        return response
    analytics_json.short_description = "Analytics (JSON)"


@admin.register(Series)
class SeriesAdmin(admin.ModelAdmin):
    list_display = ['slug']
    search_fields = ['slug']

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['created', 'plenary', 'user', 'message_trunc', 'archived']

    def message_trunc(self, obj):
        return obj.message[0:100]
    message_trunc.short_description = 'message'


