import random

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.utils.translation import ugettext_lazy as _
from django.utils.html import escape, escapejs
from django.utils.safestring import mark_safe

from accounts.models import User, EmailNotification
from plenaries.models import Plenary

class PlenaryInline(admin.TabularInline):
    model = Plenary.admins.through
    raw_id_fields = ['plenary']
    extra = 1
    verbose_name = "Plenaries this user admins"
    verbose_name_plural = verbose_name

class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User

class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm):
        model = User
        fields = ("username", "email")

@admin.register(User)
class CustomuserAdmin(UserAdmin):
    list_display = ['username', 'display_name', 'email', 'is_staff']
    fieldsets = (
        (None, {
            'fields': (
                'username',
                'display_name',
                'email',
                'profile_image',
                'password'
            )
        }),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser',
            'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2')
        }),
    )
    search_fields = ['username', 'display_name', 'email']
    ordering = ['date_joined']
    inlines = [PlenaryInline]

@admin.register(EmailNotification)
class EmailNotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'type', 'to_email', 'subject', 'created']
    search_fields = ['user__email', 'user__username']
    list_filter = ['type']
    date_hierarchy = 'created'
    readonly_fields = [
        'user', 'event_key', 'type', 'from_email', 'to_email', 'subject',
        'body_txt_fmt', 'body_html_fmt', 'opens', 'clicks', 'deliveries',
        'failures'
    ]
    exclude = ['body_txt', 'body_html']

    def body_txt_fmt(self, obj):
        return mark_safe("""
            <div style='display: inline-block'>
                <pre style='white-space: pre-wrap'>%s</pre>
            </div>
        """ % escape(obj.body_txt))
    body_txt_fmt.short_description = 'Body TXT'

    def body_html_fmt(self, obj):
        if obj.body_html:
            return mark_safe("""
                <iframe id="{id}" style='width: 600px; height: 400px;'></iframe>
                <script>
                    var iframe = document.getElementById("{id}");
                    var doc = iframe.contentWindow.document;
                    doc.open();
                    doc.write("{html}");
                    doc.close();
                </script>
            """.format(
                id="id%s" % random.random(),
                html=escapejs(obj.body_html)
            ))
        return "-"
    body_html_fmt.short_description = "Body HTML"

