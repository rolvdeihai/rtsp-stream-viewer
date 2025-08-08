from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'wss/stream/(?P<stream_url>.+)/$', consumers.StreamConsumer.as_asgi()),
]
