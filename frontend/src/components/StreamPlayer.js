import React, { useEffect, useRef, useState, useCallback } from "react";

export default function StreamPlayer({ stream, onTogglePlay, onDelete }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(new Image());
  const pendingFrameRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);
  const drawFrameRef = useRef();
  const aspectRatioRef = useRef(16/9);
  
  // Canvas rendering function
  const drawFrame = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    if (!container || !canvas) return;
    
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    const containerWidth = container.clientWidth;
    canvas.width = containerWidth;
    canvas.height = containerWidth / aspectRatioRef.current;
    
    const hRatio = canvas.width / img.width;
    const vRatio = canvas.height / img.height;
    const ratio = Math.max(hRatio, vRatio);
    const offsetX = (canvas.width - img.width * ratio) / 2;
    const offsetY = (canvas.height - img.height * ratio) / 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      0, 0, img.width, img.height,
      offsetX, offsetY, 
      img.width * ratio, 
      img.height * ratio
    );
    
    isDrawingRef.current = false;
    
    if (pendingFrameRef.current) {
      processFrame(pendingFrameRef.current);
      pendingFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    drawFrameRef.current = drawFrame;
  }, [drawFrame]);

  // Frame processing with buffering
  const processFrame = useCallback((data) => {
    if (isDrawingRef.current) {
      pendingFrameRef.current = data;
      return;
    }
    
    isDrawingRef.current = true;
    imageRef.current.src = `data:image/jpeg;base64,${data}`;
  }, []);

  useEffect(() => {
    imageRef.current.onload = () => {
      if (imageRef.current.width && imageRef.current.height) {
        aspectRatioRef.current = imageRef.current.width / imageRef.current.height;
      }
      drawFrameRef.current();
    };
  }, []);

  // WebSocket connection handling with reconnection
  useEffect(() => {
    let isMounted = true;
    let ws = null;
    let reconnectTimeout = null;

    const connect = () => {
      if (!isMounted || !stream.playing) return;
      
      setLoading(true);
      const encodedUrl = encodeURIComponent(stream.url);
      ws = new WebSocket(`wss://rtsp-stream-viewer-production.up.railway.app/ws/stream/${encodedUrl}/`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        if (!isMounted) return;
        processFrame(event.data);
        setLoading(false);
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setLoading(false);
        
        // Reconnect if still playing
        if (stream.playing) {
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [stream.playing, stream.url, processFrame]);

  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen().catch(console.error);
      }
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-gray-800 rounded-lg shadow-lg p-2 flex flex-col items-center relative"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg">
          <div className="loader border-t-transparent border-solid rounded-full border-white border-4 w-8 h-8 animate-spin"></div>
        </div>
      )}
      <div className="w-full" style={{ aspectRatio: '16/9' }}>
        <canvas 
          ref={canvasRef} 
          className="rounded-lg w-full h-full"
        />
      </div>
      <div className="flex justify-between w-full mt-2 px-1">
        <span className="text-sm font-semibold">{stream.name}</span>
        <div className="flex gap-2">
          <button
            onClick={onTogglePlay}
            className="px-2 py-1 bg-blue-600 text-xs rounded hover:bg-blue-500"
          >
            {stream.playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={handleFullscreen}
            className="px-2 py-1 bg-green-600 text-xs rounded hover:bg-green-500"
          >
            Fullscreen
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 bg-red-600 text-xs rounded hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}