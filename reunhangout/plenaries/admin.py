from django.contrib import admin
from django import forms

from plenaries.models import Plenary, Series, ChatMessage
from richtext.utils import RichTextField

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

class SeriesForm(forms.ModelForm):
    description = RichTextField(required=False)

@admin.register(Series)
class SeriesAdmin(admin.ModelAdmin):
    form = SeriesForm
    list_display = ['name', 'organizer', 'start_date', 'end_date']
    search_fields = ['name', 'organizer', 'description']
    prepopulated_fields = {'slug': ['name']}
    filter_horizontal = ['admins']

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['created', 'plenary', 'user', 'message_trunc']

    def message_trunc(self, obj):
        return obj.message[0:100]
    message_trunc.short_description = 'message'


