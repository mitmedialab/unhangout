from django import template
from django.utils.safestring import mark_safe
from django.template.defaultfilters import striptags, escapejs, truncatechars
from django.core.urlresolvers import reverse

from frontend.models import PageComponent

register = template.Library()

def admin_edit_link(model):
    url = reverse('admin:{}_{}_change'.format(
        model._meta.app_label, model._meta.model_name
    ), args=[model.pk])
    return "<a class='admin-edit-link' target='_blank' href='{url}' " \
              "title='Edit {type} \"{name}\"'>" \
              "&#9998; Edit {type} \"{short_name}\"</a>".format(
                      url=url,
                      type=model._meta.verbose_name,
                      name=str(model),
                      short_name=truncatechars(str(model), 30))

@register.simple_tag(takes_context=True)
def open_admin_edit_region(context, model):
    user = context['user']
    editable = (
        hasattr(model, "_meta") and
        user.has_perm("{}.change_{}".format(
            model._meta.app_label,
            model._meta.model_name))
    )
    if editable:
        html = "".join((
            "<div class='edit-region editable'>",
            admin_edit_link(model)
        ))
    else:
        html = "<div class='edit-region'>"
    return mark_safe(html)

@register.simple_tag
def close_admin_edit_region():
    return "</div>"

@register.simple_tag(takes_context=True)
def page_component(context, key, default='', formatting="html"):
    pc, created = PageComponent.objects.get_or_create(key=key)
    if created and default:
        pc.title = key.replace('_', ' ').title()
        pc.html = default
        pc.save()
    if formatting == "html":
        return mark_safe(u"".join((
            open_admin_edit_region(context, pc),
            pc.html or "&nbsp;",
            close_admin_edit_region()
        )))
    else:
        return escapejs(striptags(pc.html))


