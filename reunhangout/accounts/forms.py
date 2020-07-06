import types

from django import forms
from django.utils.safestring import mark_safe
from django.utils.html import escape, conditional_escape

from django.contrib.auth import get_user_model

User = get_user_model()

class AccountSettingsForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Monkeypatch profile render method to add the current image, which is
        # a function of the instance, not necessarily the field (it could be an
        # image linked to a social profile rather than uploaded by the user).
        # We have to do this here because we don't get access to the user
        # instance once we're inside the widget.
        current_image = self.instance.get_profile_image_nocache()
        def render_profile_image(self, name, value, attrs=None, renderer=None):
            template = (
                '<a href="%(initial_url)s" target="_blank" rel="noopener noreferrer">'
                  '<img src="%(initial_url)s" alt="Profile image"'
                      ' style="width: 64px" />'
                '</a> '
                '<br />'
                '%(input)s'
            )

            context = {
                'input': forms.widgets.Input.render(self, name, value, attrs),
                'initial_url': escape(current_image),
            }

            return mark_safe(template % context)

        # Replace bound method
        pi_widget = self.fields['profile_image'].widget
        pi_widget.render = types.MethodType(render_profile_image, pi_widget)

        # Replace help text for display name to reflect social auth name.
        if not self.instance.display_name:
            self.fields['display_name'].help_text = mark_safe(
                "%s. Currently using <em>%s.</em>" % (
                    escape(self.fields['display_name'].help_text),
                    escape(self.instance.get_display_name_nocache())
                )
            )

    class Meta:
        model = User
        fields = [
                'username', 'display_name', 'profile_image',
                'receive_wrapup_emails', 'contact_card_email', 'contact_card_twitter',
        ]
