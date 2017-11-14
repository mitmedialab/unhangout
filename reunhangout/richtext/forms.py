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
        js = [f['publicPath'] for f in maybe_get_files([("editor", "js")])]
        css = {'all': [f['publicPath'] for f in maybe_get_files([("editor", "css")])]}

class RichTextWidget(forms.Textarea, RichTextMedia):
    def __init__(self, attrs=None):
        default_attrs = {'class': 'js-rich-text-editor', 'data-widget': 'rich-text-editor'}
        if attrs:
            default_attrs.update(attrs)
        super(RichTextWidget, self).__init__(default_attrs)

class RichTextFormField(forms.CharField):
    widget = RichTextWidget
