import urllib.parse
import cv2
import base64
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer

class StreamConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        raw_url = self.scope['url_route']['kwargs']['stream_url']
        self.stream_url = urllib.parse.unquote(raw_url)
        await self.accept()
        self.running = True
        asyncio.create_task(self.stream_video())

    async def disconnect(self, close_code):
        self.running = False

    async def stream_video(self):
        while self.running:
            cap = cv2.VideoCapture(self.stream_url)
            if not cap.isOpened():
                await asyncio.sleep(2)
                continue

            while self.running and cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                _, buffer = cv2.imencode('.jpg', frame)
                frame_b64 = base64.b64encode(buffer).decode('utf-8')
                try:
                    await self.send(text_data=frame_b64)
                except:
                    self.running = False
                    break
                await asyncio.sleep(0.05)
            cap.release()
            await asyncio.sleep(1)
