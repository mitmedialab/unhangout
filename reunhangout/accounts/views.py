from django.shortcuts import render

def profile(request):
    return render(request, "frontend/todo.html")

def settings(request):
    return render(request, "frontend/todo.html")
