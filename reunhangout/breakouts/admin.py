from django.contrib import admin

from breakouts.models import Breakout, ErrorReport

@admin.register(Breakout)
class BreakoutAdmin(admin.ModelAdmin):
    list_display = ['title', 'plenary', 'is_proposal']
    list_filter = ['is_proposal', 'plenary']
    prepopulated_fields = {'slug': ['title']}
    search_fields = ['title', 'description']
    readonly_fields = ['activities', 'history']

@admin.register(ErrorReport)
class ErrorReportAdmin(admin.ModelAdmin):
    list_display = ['created', 'user', 'breakout']
    date_hierarchy = 'created'
    search_fields = ['additional_info', 'collected_data']
