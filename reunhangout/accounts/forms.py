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
        current_image = self.instance.get_profile_image()
        def render_profile_image(self, name, value, attrs=None):
            template = (
                '<a href="%(initial_url)s" target="_blank" rel="noopener noreferrer">'
                  '%(initial)s'
                '</a> '
                '%(clear_template)s<br />%(input_text)s: %(input)s'
            )

            context = {
                'input_text': self.input_text,
                'clear_template': '',
                'clear_checkbox_label': self.clear_checkbox_label,
                'input': forms.widgets.Input.render(self, name, value, attrs),
                'initial_url': current_image,
                'initial': '<img src="%s" alt="Profile image" style="width: 64px" />' % (
                    escape(current_image),
                )
            }

            # Image is not clearable unless it is explicitly set (social image
            # is always used if not explicitly set).
            if value and hasattr(value, "url"):
                checkbox_name = self.clear_checkbox_name(name)
                checkbox_id = self.clear_checkbox_id(checkbox_name)
                context.update({
                    'clear_checkbox_name': conditional_escape(name),
                    'clear_checkbox_id': conditional_escape(checkbox_name),
                    'clear': forms.widgets.CheckboxInput().render(
                        checkbox_name, False, attrs={'id': checkbox_id}
                    ),
                })
                context['clear_template'] = self.template_with_clear % context

            return mark_safe(template % context)

        # Replace bound method
        pi_widget = self.fields['profile_image'].widget
        pi_widget.render = types.MethodType(render_profile_image, pi_widget)

    class Meta:
        model = User
        fields = ['username', 'display_name', 'profile_image']
