from io import StringIO, BytesIO
import zipfile
import requests
from lxml import etree

from django.conf import settings
from django.utils.html import escape

def export_etherpads(plenary):
    exports = []
    for breakout in plenary.breakout_set.all():
        url = "".join((
            "https://",
            settings.ETHERPAD_SERVER,
            "/p/",
            breakout.webrtc_id,
            "/export/html"
        ))
        res = requests.get(url)
        exports.append((breakout, res.text))

    if not exports:
        return None

    structure = etree.HTML(exports[0][1])
    structure_body = structure.find("body")
    structure_body.text = ""
    structure_body.tail = ""
    for child in list(structure_body):
        structure_body.remove(child)

    for breakout, html in exports:
        body = etree.HTML(html).find("body")
        heading = etree.Element("h1")
        heading.text = escape(breakout.title)
        structure_body.append(heading)

        # Add text content before elements
        if body.text:
            text = etree.Element("span")
            text.text = body.text
            structure_body.append(text)

        for el in list(body):
            structure_body.append(el)

        # Add text content after elements
        if body.tail:
            text = etree.Element("span")
            text.text = body.tail
            structure_body.append(text)

        structure_body.append(etree.Element("hr"))

    return etree.tostring(structure)

def zip_exported_etherpads(plenary_queryset):
    plenaries = list(plenary_queryset.prefetch_related('breakout_set'))

    fh = BytesIO()
    with zipfile.ZipFile(fh, 'w') as archive:
        empty = True
        for plenary in plenaries:
            html_fh = export_etherpads(plenary)
            if html_fh is None:
                continue
            empty = False
            filename = "{} - {}.html".format(plenary.name, plenary.id)
            archive.writestr(filename, html_fh)
    if empty:
        return None
    else:
        return fh.getvalue()
