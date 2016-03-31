from django.contrib import admin

from breakouts.models import Breakout, GoogleHangout

@admin.register(Breakout)
class BreakoutAdmin(admin.ModelAdmin):
    list_display = ['title', 'plenary', 'google_hangout', 'is_hoa', 'is_proposal']
    list_filter = ['is_hoa', 'is_proposal', 'plenary']
    prepopulated_fields = {'slug': ['title']}
    search_fields = ['title', 'description']
    readonly_fields = ['activities', 'history']

@admin.register(GoogleHangout)
class GoogleHangoutAdmin(admin.ModelAdmin):
    list_display = ['url']
    search_fields = ['url']
