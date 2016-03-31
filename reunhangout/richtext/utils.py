from django import forms
from django.utils.safestring import mark_safe
from django.utils import six
from webpack_loader.templatetags.webpack_loader import get_files
import bleach
from bleach_whitelist.bleach_whitelist import markdown_tags, markdown_attrs

class RichTextualizeForm(forms.Form):
    def __init__(self, *args, **kwargs):
        super(RichTextualizeForm, self).__init__(*args, **kwargs)
        for name,field in self.fields.items():
            if isinstance(field.widget, forms.Textarea):
                field.widget.attrs['class'] = " ".join((
                    field.widget.attrs.get('class', ''), "js-rich-text-editor"
                )).strip()

    class Media:
        js = [f['publicPath'] for f in get_files('editor', 'js')]
        css = []

class RichTextualizedModelForm(forms.ModelForm, RichTextualizeForm):
    pass

class RichTextualizedAdminForm(forms.ModelForm, RichTextualizeForm):
    @property
    def media(self):
        super_js = super(RichTextualizedAdminForm, self).media.js
        return forms.Media(
            js=list(super_js) + [static("admin/js/%s" % path) for path in js]
        )


def sanitize(html):
    return mark_safe(bleach.linkify(bleach.clean(
        html, markdown_tags, markdown_attrs, []
    )))

