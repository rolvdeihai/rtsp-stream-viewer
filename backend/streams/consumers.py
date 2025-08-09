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

# Global stream manager with reference counting
STREAM_CACHE = defaultdict(lambda: {'cap': None, 'executor': None, 'ref_count': 0})

class StreamConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.buffer_size = 1  # Minimal buffer for low latency
        self.target_fps = 20  # Reduced FPS for smoother processing
        self.scale_factor = 0.4  # Further downscaling for performance
        self.quality = 60  # Lower quality for faster encoding
        self.last_frame_time = 0
        self.frame_buffer = []  # Small client-side frame buffer
        self.max_buffer_size = 2  # Buffer up to 2 frames for smoothing
        self.stream_url = None
        self.cap = None
        self.executor = None
        self.running = False

    async def connect(self):
        raw_url = self.scope['url_route']['kwargs']['stream_url']
        self.stream_url = urllib.parse.unquote(raw_url)
        await self.accept()

        # Reuse or create VideoCapture instance
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
        """Optimized video capture task with smoothing"""
        if not self.cap or not self.cap.isOpened():
            logger.error(f"Stream not initialized: {self.stream_url}")
            return

        frame_interval = 1.0 / self.target_fps
        last_frame = None
        
        while self.running:
            start_time = time.time()
            
            try:
                if self.executor._shutdown:
                    logger.warning("Executor already shut down")
                    break

                processed_frame = await asyncio.get_event_loop().run_in_executor(
                    self.executor,
                    self.capture_and_process_frame,
                    self.cap
                )
                
                if processed_frame is None:
                    if last_frame:
                        processed_frame = last_frame
                    else:
                        await asyncio.sleep(0.01)  # Reduced sleep for faster recovery
                        continue
                
                # Add to frame buffer for smoothing
                self.frame_buffer.append(processed_frame)
                if len(self.frame_buffer) > self.max_buffer_size:
                    self.frame_buffer.pop(0)
                
                # Send the oldest frame in the buffer for smoother playback
                try:
                    if self.frame_buffer:
                        await self.send(text_data=self.frame_buffer[0])
                        self.frame_buffer.pop(0)
                    last_frame = processed_frame
                except Exception as e:
                    logger.error(f"Send error: {e}")
                    self.running = False
                    break
                
                # Adaptive FPS based on processing time
                elapsed = time.time() - start_time
                if elapsed > frame_interval * 1.5:
                    self.target_fps = max(5, self.target_fps - 5)
                    frame_interval = 1.0 / self.target_fps
                    logger.info(f"Adjusted FPS to {self.target_fps} for {self.stream_url}")
                
                sleep_time = max(0, frame_interval - elapsed)
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                    
            except RuntimeError as e:
                logger.error(f"Executor error: {e}")
                break
            except Exception as e:
                logger.error(f"Unexpected error in video_capture_task: {e}")
                break

        logger.info(f"Capture stopped: {self.stream_url}")

    def create_capture(self):
        """Create optimized video capture with retry logic"""
        for attempt in range(3):
            cap = cv2.VideoCapture(self.stream_url)
            if cap.isOpened():
                cap.set(cv2.CAP_PROP_BUFFERSIZE, self.buffer_size)
                cap.set(cv2.CAP_PROP_FPS, self.target_fps)
                cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M','J','P','G'))
                return cap
            logger.warning(f"Retry {attempt + 1}/3 for stream: {self.stream_url}")
            time.sleep(1)
        return None

    def capture_and_process_frame(self, cap):
        """Efficient frame capture and processing"""
        if not cap.grab():
            return None
            
        ret, frame = cap.retrieve()
        if not ret:
            return None
            
        h, w = frame.shape[:2]
        new_w = int(w * self.scale_factor)
        new_h = int(h * self.scale_factor)
        
        resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
        _, buffer = cv2.imencode('.jpg', resized, [
            cv2.IMWRITE_JPEG_QUALITY, self.quality,
            cv2.IMWRITE_JPEG_OPTIMIZE, 1
        ])
        
        return base64.b64encode(buffer).decode('utf-8')