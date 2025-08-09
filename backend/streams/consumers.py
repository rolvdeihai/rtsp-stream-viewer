import urllib.parse
import cv2
import base64
import asyncio
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)
executor = ThreadPoolExecutor(max_workers=4)  # Adjust based on CPU cores

class StreamConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        raw_url = self.scope['url_route']['kwargs']['stream_url']
        self.stream_url = urllib.parse.unquote(raw_url)
        await self.accept()
        self.running = True
        self.last_frame_time = 0
        self.frame_queue = asyncio.Queue(maxsize=2)  # Buffer only 2 frames
        asyncio.create_task(self.video_capture_task())
        asyncio.create_task(self.video_send_task())

    async def disconnect(self, close_code):
        self.running = False
        # Clear queue to unblock tasks
        while not self.frame_queue.empty():
            self.frame_queue.get_nowait()

    async def video_capture_task(self):
        """Task to capture frames in background"""
        cap = cv2.VideoCapture(self.stream_url)
        if not cap.isOpened():
            logger.error(f"Failed to open stream: {self.stream_url}")
            return

        target_fps = 20  # Target frames per second
        frame_interval = 1.0 / target_fps
        
        while self.running:
            start_time = time.time()
            
            # Read frame in thread pool to avoid blocking
            ret, frame = await asyncio.get_event_loop().run_in_executor(
                executor, 
                lambda: cap.read()
            )
            
            if not ret:
                logger.warning(f"Frame read failed: {self.stream_url}")
                await asyncio.sleep(0.1)
                continue
                
            # Process frame only if needed
            if self.frame_queue.full():
                # Skip frame if queue is full
                continue
                
            # Process frame in thread pool
            processed_frame = await asyncio.get_event_loop().run_in_executor(
                executor,
                self.process_frame,
                frame
            )
            
            try:
                # Non-blocking queue put
                self.frame_queue.put_nowait(processed_frame)
            except asyncio.QueueFull:
                pass
                
            # Maintain target FPS
            elapsed = time.time() - start_time
            sleep_time = max(0, frame_interval - elapsed)
            await asyncio.sleep(sleep_time)
            
        cap.release()
        logger.info(f"Capture stopped: {self.stream_url}")

    async def video_send_task(self):
        """Task to send frames to client"""
        while self.running:
            try:
                # Get frame with timeout
                frame_b64 = await asyncio.wait_for(
                    self.frame_queue.get(), 
                    timeout=1.0
                )
                
                # Send immediately
                await self.send(text_data=frame_b64)
                
                # Update timing for diagnostics
                self.last_frame_time = time.time()
                
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                if self.running:
                    await self.send(text_data="heartbeat")
            except Exception as e:
                logger.error(f"Send error: {e}")
                self.running = False

    def process_frame(self, frame):
        """Process frame with efficient resizing and encoding"""
        # Downscale while maintaining aspect ratio
        h, w = frame.shape[:2]
        scale_factor = 0.6  # Adjust based on performance
        new_w = int(w * scale_factor)
        new_h = int(h * scale_factor)
        
        resized = cv2.resize(frame, (new_w, new_h))
        
        # Encode with quality balance
        _, buffer = cv2.imencode('.jpg', resized, [
            cv2.IMWRITE_JPEG_QUALITY, 70
        ])
        
        return base64.b64encode(buffer).decode('utf-8')