from django.contrib import admin

from breakouts.models import Breakout

@admin.register(Breakout)
class BreakoutAdmin(admin.ModelAdmin):
    list_display = ['title', 'plenary', 'is_proposal']
    list_filter = ['is_proposal', 'plenary']
    prepopulated_fields = {'slug': ['title']}
    search_fields = ['title', 'description']
    readonly_fields = ['activities', 'history']
