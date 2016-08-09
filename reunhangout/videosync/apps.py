from django.apps import AppConfig


class VideosyncConfig(AppConfig):
    name = 'videosync'

    def ready(self):
        import videosync.signals
