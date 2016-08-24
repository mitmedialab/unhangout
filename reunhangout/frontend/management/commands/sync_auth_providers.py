from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.sites.models import Site

from allauth.socialaccount.models import SocialApp

class Command(BaseCommand):
    help = 'django-allauth stores its social app configuration in the ' \
           'database, which is inconvenient for server deployments.  Instead, ' \
           'put credentials in settings, and then use this management command ' \
           'to sync those settings with the database.  The command can be ' \
           'executed on each deployment.'
    def handle(self, *args, **kwargs):
        # NOTE: we aren't deleting any stale (removed) SocialApp's here, as
        # that could screw up old user models' relations. Safer to require
        # that to be a manual process.
        changed = False
        site = Site.objects.get_current()
        for provider, keys in settings.ALLAUTH_APPS.items():
            if not keys['client_id']:
                continue
            # We could just use `update_or_create` here, but then we
            # wouldn't be able to report changed status correctly. So instead
            # do it the manual way.
            lookup = {'provider': provider, 'name': provider}
            try:
                app = SocialApp.objects.get(**lookup)
            except SocialApp.DoesNotExist:
                changed = True
                SocialApp.objects.create(
                    **dict(list(lookup.items()) + list(keys.items()))
                )
                app.sites.add(site)
            else:
                app_changed = False
                for key, val in keys.items():
                    if getattr(app, key) != val:
                        app_changed = changed = True
                        setattr(app, key, val)
                if app_changed:
                    app.save()
                if site not in app.sites.all():
                    changed = True
                    app.sites.add(site)
        if changed:
            print("changed")
        else:
            print("no change")
