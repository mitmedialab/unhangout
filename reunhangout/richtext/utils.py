from django import forms
from django.utils.safestring import mark_safe
from webpack_loader.templatetags.webpack_loader import get_files
import bleach
from bleach_whitelist.bleach_whitelist import markdown_tags, markdown_attrs

def maybe_get_files(arg_sets):
    """
    Allow assets to be missing without raising an exception. This is needed to
    allow e.g. collectstatic to run before assets have been built for the first
    time.
    """
    out = []
    for args in arg_sets:
        try:
            out += get_files(*args)
        except OSError:
            print("Missing assets for {}".format(args))
    return out

class RichTextMedia:
    class Media:
        js = [f['publicPath'] for f in maybe_get_files((("main", "js"), ("editor", "js")))]
        css = {'all': [
            f['publicPath'] for f in maybe_get_files((("main", "css"), ("editor", "css")))
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

def _add_noopener(attrs, new=False):
    attrs['rel'] = "nofollow noopener noreferrer"
    return attrs

def _add_target_blank(attrs, new=False):
    attrs['target'] = '_blank'
    return attrs

def sanitize(html, link=True, tags=None, attrs=valid_attrs, styles=None):
    if tags is None:
        tags = markdown_tags + ['ins']
    clean = bleach.clean(html, tags, attrs, styles or [])
    if link:
        clean = bleach.linkify(clean, [_add_noopener, _add_target_blank])
    return mark_safe(clean)

