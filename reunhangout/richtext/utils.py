import re
import bleach
from bleach_whitelist.bleach_whitelist import markdown_tags, markdown_attrs
from django.utils.safestring import mark_safe
from django.conf import settings
from urllib.parse import urlparse, urlunparse

def _span_attributes(tag, attr, value):
    if attr == "data-mention-user-id" and re.match('^\d+$', value):
        return True
    return False

valid_attrs = {}
valid_attrs.update(markdown_attrs)
valid_attrs['span'] = _span_attributes

valid_tags = markdown_tags + ['ins']
valid_styles = None

def _add_noopener(attrs, new=False):
    attrs[(None, 'rel')] = "nofollow noopener noreferrer"
    return attrs

def _add_target_blank(attrs, new=False):
    attrs[(None, 'target')] = '_blank'
    return attrs

def _maybe_target_blank(attrs, new=False):
    href = attrs.get('href')
    if href:
        url = urlparse(href)
        exempt = getattr(settings, 'NOOPENER_EXEMPT_HOSTS', settings.ALLOWED_HOSTS)
        is_local = url.hostname in exempt or (
            url.hostname is None and url.netloc == ''
        )

        if not is_local:
            # Make all non-local links target blank.
            attrs['target'] = '_blank'
            attrs['rel'] = "noopener noreferrer"
        elif url.scheme == 'http':
            # Make all local absolute links https.
            parts = list(url)
            parts[0] = "https"
            attrs['href'] = urlunparse(parts)

    return attrs

def sanitize(html, link=True, tags=valid_tags, attrs=valid_attrs, styles=valid_styles):
    # Trap the sort of empty output the rich text editor creates.
    if not html:
        return ""
    if re.match("^(\s*<p>\s*(<br>|&nbsp;|\xa0)*\s*</p>\s*)*$", html):
        return ""

    clean = bleach.clean(html, tags, attrs, styles or [])
    if link:
        clean = bleach.linkify(clean, [_add_noopener, _add_target_blank])
    safe = mark_safe(clean)
    setattr(safe, "unsafe", html)
    return safe

