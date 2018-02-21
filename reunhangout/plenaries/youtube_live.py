import datetime
import httplib2
import json

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from apiclient.discovery import build
from oauth2client.client import (
    OAuth2WebServerFlow, OAuth2Credentials, EXPIRY_FORMAT,
    FlowExchangeError, HttpAccessTokenRefreshError,
)
from googleapiclient.errors import HttpError

YOUTUBE_READ_WRITE_SCOPE = "https://www.googleapis.com/auth/youtube"
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"


class YoutubeLiveError(Exception):
    def __init__(self, orig):
        self.orig = orig

    def __str__(self):
        return str(self.orig)


def get_flow_from_settings(redirect_uri, **kwargs):
    """
    Similar to `oauth2client.client.flow_from_clientsecrets`, but building from
    a settings data structure instead of a file.  Settings should define:

    GOOGLE_CLIENT_SECRET = {...contents of client_secret.json...}
        
    """
    return OAuth2WebServerFlow(
        scope=YOUTUBE_READ_WRITE_SCOPE,
        redirect_uri=redirect_uri,
        access_type='offline',
        include_granted_scopes='true',
        **settings.GOOGLE_CLIENT_SECRET,
        **kwargs
    )


def has_credentials(user):
    return (
        user.youtube_credentials and
        user.youtube_credentials.get('refresh_token')
    )


def persist_credentials(user, credentials):
    # Don't persist client_id and client_secret -- we'll fetch those from
    # settings.
    user.youtube_credentials = user.youtube_credentials or {}
    user.youtube_credentials.update({
        'access_token': credentials.access_token,
        'token_uri': credentials.token_uri,
        'token_expiry': credentials.token_expiry.strftime(EXPIRY_FORMAT),
        'user_agent': credentials.user_agent,
        'scopes': credentials.scopes
    })
    if credentials.refresh_token:
        user.youtube_credentials['refresh_token'] = credentials.refresh_token
    user.save()


def get_authenticated_youtube_service(user):
    kwargs = {}
    kwargs.update(user.youtube_credentials)
    kwargs.update(settings.GOOGLE_CLIENT_SECRET)
    kwargs['token_expiry'] = datetime.datetime.strptime(
        kwargs['token_expiry'],
        EXPIRY_FORMAT
    )

    credentials = OAuth2Credentials(**kwargs)
    youtube = build(
        YOUTUBE_API_SERVICE_NAME,
        YOUTUBE_API_VERSION,
        http=credentials.authorize(httplib2.Http())
    )
    persist_credentials(user, credentials)
    return youtube, credentials


def insert_broadcast(youtube, broadcast_title, start_time=None, end_time=None,
                     privacy_status='unlisted'):
    """
    Create a liveBroadcast resource and set its title, scheduled start time,
    scheduled end time, and privacy status.
    """
    if start_time is None:
        start_time = timezone.now()
    start_time_str = start_time.isoformat()
    end_time_str = end_time.isoformat() if end_time else None

    insert_broadcast_response = youtube.liveBroadcasts().insert(
        part="snippet,status,contentDetails",
        body={
            'snippet': {
                'title': broadcast_title,
                'scheduledStartTime': start_time_str,
                'scheduledEndTime': end_time_str,
            },
            'status': {'privacyStatus': privacy_status},
            'contentDetails': {
                'enableAutoStart': True,
                'latencyPreference': 'low',
            }
        }
    ).execute()
    #print("broadcast", insert_broadcast_response)
    return insert_broadcast_response


def end_broadcast(youtube, broadcast_id):
    end_response = youtube.liveBroadcasts().transition(
        part="status",
        id=broadcast_id,
        broadcastStatus="complete",
    ).execute()
    #print(end_response)
    assert end_response['status']['lifeCycleStatus'] == 'complete'
    return end_response


def insert_stream(youtube, stream_title):
    """
    Create a liveStream resource and set its title, format, and ingestion type.
    """
    insert_stream_response = youtube.liveStreams().insert(
        part="snippet,cdn",
        body={
            'snippet': {'title': stream_title},
            'cdn': {'format': '1080p', 'ingestionType': 'rtmp'}
        }
    ).execute()
    #print("stream", insert_stream_response)
    return insert_stream_response


def bind_broadcast(youtube, broadcast_id, stream_id):
    bind_broadcast_response = youtube.liveBroadcasts().bind(
        part='id,contentDetails',
        id=broadcast_id,
        streamId=stream_id
    ).execute()
    #print("bind", bind_broadcast_response)
    return bind_broadcast_response


def create_livestream(title, youtube):
    try:
        broadcast_res = insert_broadcast(youtube, title)
        stream_res = insert_stream(youtube, title)
        bind_res = bind_broadcast(youtube, broadcast_res['id'], stream_res['id'])
    except HttpAccessTokenRefreshError as e:
        raise YoutubeLiveError(e)

    ingestion_info = stream_res['cdn']['ingestionInfo']
    return {
        'rtmp': ingestion_info['ingestionAddress'],
        'key': ingestion_info['streamName'],
        'broadcast_id': broadcast_res['id']
    }
