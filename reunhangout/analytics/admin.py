from django.contrib import admin

from analytics.models import Action

# Register your models here.
class ActionAdmin(admin.ModelAdmin):
    list_display = ['action', 'user', 'timestamp', 'plenary', 'breakout']
    search_fields = ['user__username', 'user__email', 'data']
    list_filter = ['action', 'plenary']
    date_hierarchy = 'timestamp'

admin.site.register(Action, ActionAdmin)
