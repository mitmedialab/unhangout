from django import forms
from django.utils.safestring import mark_safe
from webpack_loader.templatetags.webpack_loader import get_files
import bleach
from bleach_whitelist.bleach_whitelist import markdown_tags, markdown_attrs

class RichTextMedia:
    class Media:
        js = [f['publicPath'] for f in get_files("main", "js") + get_files("editor", "js")]
        css = {'all': [
            f['publicPath'] for f in get_files("main", "css") + get_files("editor", "css")
        ]}

class RichTextWidget(forms.Textarea, RichTextMedia):
    def __init__(self, attrs=None):
        default_attrs = {'class': 'js-rich-text-editor'}
        if attrs:
            default_attrs.update(attrs)
        super(RichTextWidget, self).__init__(default_attrs)

class RichTextField(forms.CharField):
    widget = RichTextWidget

class RichTextualizeForm(forms.Form, RichTextMedia):
    def __init__(self, *args, **kwargs):
        super(RichTextualizeForm, self).__init__(*args, **kwargs)
        for name,field in self.fields.items():
            if isinstance(field.widget, forms.Textarea):
                field.widget.attrs['class'] = " ".join((
                    field.widget.attrs.get('class', ''), "js-rich-text-editor"
                )).strip()

def _p_attributes(name, value):
    return name == "class" and value in ("dropcap", "smallcap")

def _span_attributes(name, value):
    return name == "class" and value in ("smallcaps",)

valid_attrs = {}
valid_attrs.update(markdown_attrs)
valid_attrs['p'] = _p_attributes
valid_attrs['span'] = _span_attributes

def sanitize(html):
    return mark_safe(bleach.linkify(bleach.clean(
        html, markdown_tags, valid_attrs, []
    )))

