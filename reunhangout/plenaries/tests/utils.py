from django.contrib.auth.models import AnonymousUser

class TestAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner
        self.user = AnonymousUser()

    def __call__(self, scope):
        return self.inner(dict(scope, user=self.user))

    def login(self, user):
        self.user = user

    def logout(self, user):
        self.user = AnonymousUser()

