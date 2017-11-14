import pytest
from django.conf import settings
from richtext.utils import sanitize

def test_sanitize():
    assert sanitize("<p>Yes</p><script type='text/javascript'>alert('no');</script>") == \
            """<p>Yes</p>&lt;script type="text/javascript"&gt;alert('no');&lt;/script&gt;"""

    # target blank, noreferrer for external links
    assert sanitize("<a href='http://google.com/'>OK</a>") == \
            '<a href="http://google.com/" rel="nofollow noopener noreferrer" target="_blank">OK</a>'

    # linkify
    assert sanitize("http://google.com") ==  \
            '<a href="http://google.com" rel="nofollow noopener noreferrer" target="_blank">http://google.com</a>'

    assert sanitize("<p><br></p>") == ""
    assert sanitize("<p>&nbsp;</p>") == ""
    assert sanitize("<p>&nbsp;</p>\n<p><br></p>") == ""
    assert sanitize("<p>&nbsp;</p><p>OK</p>") == "<p>\xa0</p><p>OK</p>"


