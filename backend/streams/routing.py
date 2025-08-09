from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/stream/<path:stream_url>/', consumers.StreamConsumer.as_asgi()),
]