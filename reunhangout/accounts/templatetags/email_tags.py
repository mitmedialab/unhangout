import re
from django import template
from django.contrib.sites.models import Site
from django.utils.html import escape
from django.utils.safestring import mark_safe

register = template.Library()

@register.filter
def unindent(contents):
    return "\n".join([a.strip() for a in contents.split("\n")])

@register.filter
def singlespace(contents):
    return re.sub(r"(\n{3,})+", "\n\n", contents)

@register.filter
def nolinebreak(contents):
    return re.sub(r"\s*\n\s*", " ", contents)

@register.filter(is_safe=True)
def dollars_entities(content):
    # mjml seems to eat literal $1 as some kind of empty control reference.
    # Replace dollars with entities to avoid this.
    content = content.replace('$', '&#36;')
    assert '$' not in content
    return content

@register.filter
def atless(twitter_handle):    
    return twitter_handle.strip('@')

@register.filter
def atfull(twitter_handle):    
    return '@%s' % twitter_handle.strip('@')

@register.filter(is_safe=True)
def absolutify(url):
    if url.startswith("http"):
        return mark_safe(url)
    domain = Site.objects.get_current().domain
    protocol = "http://" if domain.startswith("localhost") else "https://"
    return "".join((protocol, domain, escape(url)))
