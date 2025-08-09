import React, { useEffect, useRef, useState } from "react";

export default function StreamPlayer({ stream, index, onTogglePlay, onDelete }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(new Image());
  const pendingFrameRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);
  const drawFrameRef = useRef();

  // Canvas rendering function
  const drawFrame = () => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    if (!container || !canvas) return;
    
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    // Set canvas dimensions to match container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Maintain aspect ratio (cover mode)
    const hRatio = canvas.width / img.width;
    const vRatio = canvas.height / img.height;
    const ratio = Math.max(hRatio, vRatio);
    const offsetX = (canvas.width - img.width * ratio) / 2;
    const offsetY = (canvas.height - img.height * ratio) / 2;
    
    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      0, 0, img.width, img.height,
      offsetX, offsetY, 
      img.width * ratio, 
      img.height * ratio
    );
    
    isDrawingRef.current = false;
    
    // Process next frame if exists
    if (pendingFrameRef.current) {
      processFrame(pendingFrameRef.current);
      pendingFrameRef.current = null;
    }
  };

  // Keep drawFrame reference updated
  useEffect(() => {
    drawFrameRef.current = drawFrame;
  });

  // Frame processing with buffering
  const processFrame = (data) => {
    if (isDrawingRef.current) {
      pendingFrameRef.current = data;
      return;
    }
    
    isDrawingRef.current = true;
    imageRef.current.src = `data:image/jpeg;base64,${data}`;
  };

  // Set up image onload handler
  useEffect(() => {
    imageRef.current.onload = () => {
      if (drawFrameRef.current) {
        drawFrameRef.current();
      }
    };
  }, []);

  // WebSocket connection handling
  useEffect(() => {
    if (!stream.playing) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const encodedUrl = encodeURIComponent(stream.url);
    const ws = new WebSocket(`ws://localhost:8000/ws/stream/${encodedUrl}/`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      processFrame(event.data);
      setLoading(false);
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        setLoading(false);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [stream.playing, stream.url]);

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen().catch((err) => {
          console.error("Error attempting fullscreen:", err);
        });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-gray-800 rounded-lg shadow-lg p-2 flex flex-col items-center relative min-h-[200px]"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg">
          <div className="loader border-t-transparent border-solid rounded-full border-white border-4 w-8 h-8 animate-spin"></div>
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        className="rounded-lg w-full h-full"
      />
      <div className="flex justify-between w-full mt-2 px-1">
        <span className="text-sm font-semibold text-white truncate max-w-[120px]">
          {stream.name}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onTogglePlay(index)}
            className="px-2 py-1 bg-blue-600 text-xs rounded hover:bg-blue-500 text-white"
          >
            {stream.playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={handleFullscreen}
            className="px-2 py-1 bg-green-600 text-xs rounded hover:bg-green-500 text-white"
          >
            Fullscreen
          </button>
          <button
            onClick={() => onDelete(index)}
            className="px-2 py-1 bg-red-600 text-xs rounded hover:bg-red-500 text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}