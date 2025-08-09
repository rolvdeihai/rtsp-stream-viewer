import urllib.parse
import cv2
import base64
import asyncio
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from channels.generic.websocket import AsyncWebsocketConsumer
from collections import defaultdict

logger = logging.getLogger(__name__)

STREAM_CACHE = defaultdict(lambda: {'cap': None, 'executor': None, 'ref_count': 0})

class StreamConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.buffer_size = 1  # Minimal buffer
        self.target_fps = 25  # Optimal FPS for motion fluidity
        self.scale_factor = 0.6  # Balanced resolution
        self.quality = 65  # Balanced quality
        self.stream_url = None
        self.cap = None
        self.executor = None
        self.running = False
        self.last_adjustment_time = 0

    async def connect(self):
        raw_url = self.scope['url_route']['kwargs']['stream_url']
        self.stream_url = urllib.parse.unquote(raw_url)
        await self.accept()

        stream_data = STREAM_CACHE[self.stream_url]
        if stream_data['ref_count'] > 0:
            self.cap = stream_data['cap']
            self.executor = stream_data['executor']
        else:
            self.executor = ThreadPoolExecutor(max_workers=1)
            self.cap = await asyncio.get_event_loop().run_in_executor(
                self.executor, 
                self.create_capture
            )
            if not self.cap or not self.cap.isOpened():
                logger.error(f"Failed to open stream: {self.stream_url}")
                await self.close()
                return
            stream_data['cap'] = self.cap
            stream_data['executor'] = self.executor

        stream_data['ref_count'] += 1
        self.running = True
        asyncio.create_task(self.video_capture_task())

    async def disconnect(self, close_code):
        self.running = False
        stream_data = STREAM_CACHE[self.stream_url]
        stream_data['ref_count'] -= 1

        if stream_data['ref_count'] <= 0:
            if self.executor:
                try:
                    self.executor.shutdown(wait=True)
                except Exception as e:
                    logger.error(f"Error shutting down executor: {e}")
            if self.cap and self.cap.isOpened():
                await asyncio.get_event_loop().run_in_executor(
                    self.executor,
                    self.cap.release
                )
            del STREAM_CACHE[self.stream_url]
        logger.info(f"Disconnected: {self.stream_url}")

    async def video_capture_task(self):
        """Optimized video capture with dynamic adjustment"""
        if not self.cap or not self.cap.isOpened():
            logger.error(f"Stream not initialized: {self.stream_url}")
            return

        frame_count = 0
        start_time = time.time()
        last_frame_time = time.time()
        
        while self.running:
            try:
                # Get the latest frame
                processed_frame = await asyncio.get_event_loop().run_in_executor(
                    self.executor,
                    self.capture_and_process_frame,
                    self.cap
                )
                
                if processed_frame is None:
                    await asyncio.sleep(0.01)
                    continue
                
                # Send immediately without buffering
                try:
                    await self.send(text_data=processed_frame)
                except Exception as e:
                    logger.error(f"Send error: {e}")
                    break
                
                # Calculate actual FPS
                frame_count += 1
                current_time = time.time()
                elapsed_time = current_time - start_time
                
                # Dynamic adjustment every 2 seconds
                if current_time - self.last_adjustment_time > 2.0:
                    actual_fps = frame_count / elapsed_time
                    
                    # Adjust settings based on performance
                    if actual_fps < self.target_fps * 0.8:
                        # Reduce quality/resolution if falling behind
                        self.quality = max(40, self.quality - 5)
                        logger.info(f"Reducing quality to {self.quality} for {self.stream_url}")
                    elif actual_fps > self.target_fps * 1.2 and self.quality < 80:
                        # Increase quality if we have headroom
                        self.quality = min(80, self.quality + 5)
                        logger.info(f"Increasing quality to {self.quality} for {self.stream_url}")
                    
                    # Reset counters
                    frame_count = 0
                    start_time = time.time()
                    self.last_adjustment_time = current_time
                    
                # Maintain target frame rate
                frame_interval = 1.0 / self.target_fps
                elapsed = current_time - last_frame_time
                sleep_time = max(0, frame_interval - elapsed)
                await asyncio.sleep(sleep_time)
                last_frame_time = time.time()
                
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                await asyncio.sleep(1)

    def create_capture(self):
        """Create optimized video capture"""
        cap = cv2.VideoCapture(self.stream_url)
        if cap.isOpened():
            cap.set(cv2.CAP_PROP_BUFFERSIZE, self.buffer_size)
            cap.set(cv2.CAP_PROP_FPS, self.target_fps)
            # Try to enable hardware acceleration
            cap.set(cv2.CAP_PROP_HW_ACCELERATION, cv2.VIDEO_ACCELERATION_ANY)
            # Use MJPEG codec if supported
            cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M','J','P','G'))
        return cap

    def capture_and_process_frame(self, cap):
        """Capture with buffer flushing and efficient processing"""
        # Flush buffer to get the latest frame
        for _ in range(2):
            if not cap.grab():
                return None
        
        ret, frame = cap.retrieve()
        if not ret or frame is None:
            return None
        
        # Efficient processing
        h, w = frame.shape[:2]
        new_w = int(w * self.scale_factor)
        new_h = int(h * self.scale_factor)
        
        # Use faster resize method
        resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        
        # Optimized encoding
        _, buffer = cv2.imencode('.jpg', resized, [
            cv2.IMWRITE_JPEG_QUALITY, self.quality,
            cv2.IMWRITE_JPEG_OPTIMIZE, 1
        ])
        
        return base64.b64encode(buffer).decode('utf-8')