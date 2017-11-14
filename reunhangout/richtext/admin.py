from django.contrib import admin
from .models import RichTextField
from .forms import RichTextWidget, RichTextFormField

class RichTextAdmin(admin.ModelAdmin):
    formfield_overrides = {
        RichTextField: {
            'widget': RichTextWidget,
            'form_class': RichTextFormField,
        }
    }
