from django.shortcuts import render

from frontend.models import PageComponent

def page_component_view(request, key, default_title):
    pc, created = PageComponent.objects.get_or_create(key=key)
    if created:
        pc.title = default_title
        pc.html = '<h1>%s</h1><p>... admin, edit me ...</p>' % default_title
        pc.save()
    return render(request, "frontend/page_component_simple.html", {
        'title': pc.title,
        'key': key
    })

def index(request):
    return render(request, "frontend/index.html")

def about(request):
    return render(request, "frontend/about.html")

def terms(request):
    return page_component_view(request, "terms_page", "Terms of Service")

def privacy(request):
    return page_component_view(request, "privacy_page", "Privacy Policy")

def permalinks_gone(request, slug):
    return render(request, "frontend/permalinks_gone.html")
