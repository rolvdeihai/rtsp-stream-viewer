from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('wss/stream/<path:stream_url>/', consumers.StreamConsumer.as_asgi()),
]