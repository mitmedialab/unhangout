from django.db import models
from django.utils.translation import ugettext_lazy as _
from .utils import valid_attrs, valid_styles, valid_tags, sanitize
from .forms import RichTextWidget
from .forms import RichTextFormField

class RichTextField(models.TextField):
    description = _("Field storing and sanitizing rich HTML.")

    def __init__(self, valid_tags=valid_tags, valid_attrs=valid_attrs,
                       valid_styles=valid_styles, linkify=True,
                       *args, **kwargs):
        self.valid_styles = valid_styles
        self.valid_tags = valid_tags
        self.valid_attrs = valid_attrs
        self.linkify = linkify
        super(RichTextField, self).__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super(RichTextField, self).deconstruct()
        if self.valid_attrs != valid_attrs:
            kwargs['valid_attrs'] = valid_attrs
        if self.valid_tags != valid_tags:
            kwargs['valid_tags'] = valid_tags
        if self.valid_styles != valid_styles:
            kwargs['valid_styles'] = valid_styles
        if not self.linkify:
            kwargs['linkify'] = self.linkify
        return name, path, args, kwargs

    def from_db_value(self, value, *args):
        raw = value
        return sanitize(raw, link=self.linkify, tags=self.valid_tags,
                attrs=self.valid_attrs, styles=self.valid_styles)

    def formfield(self, **kwargs):
        defaults = {
            'widget': RichTextWidget,
            'form_class': RichTextFormField
        }
        defaults.update(kwargs)
        return super(RichTextField, self).formfield(**defaults)
