import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Maximize, Trash2 } from 'lucide-react';

export default function StreamPlayer({ stream, onTogglePlay, onDelete }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(new Image());
  const pendingFrameRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
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
    
    // Ensure proper sizing on initial render
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        drawFrame();
      }
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
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
      className="bg-black rounded-lg shadow-lg overflow-hidden relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        </div>
      )}

      {/* Video Canvas */}
      <div className="w-full" style={{ aspectRatio: '16/9' }}>
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
        />
      </div>

      {/* Center Play Button (only when paused) */}
      {!stream.playing && isHovered && (
        <button
          onClick={onTogglePlay}
          className="absolute inset-0 m-auto w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-200"
        >
          <Play className="w-8 h-8 text-white ml-1" />
        </button>
      )}

      {/* Bottom Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex justify-between items-center">
          <div className="text-white">
            <div className="font-medium">{stream.name}</div>
            <div className="flex items-center text-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
              {stream.playing ? "LIVE" : "PAUSED"}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onTogglePlay}
              className="p-2 bg-white/10 backdrop-blur rounded-lg hover:bg-white/20"
              title={stream.playing ? "Pause" : "Play"}
            >
              {stream.playing ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white" />
              )}
            </button>
            
            <button
              onClick={handleFullscreen}
              className="p-2 bg-white/10 backdrop-blur rounded-lg hover:bg-white/20"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4 text-white" />
            </button>
            
            <button
              onClick={onDelete}
              className="p-2 bg-white/10 backdrop-blur rounded-lg hover:bg-red-500/80"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}