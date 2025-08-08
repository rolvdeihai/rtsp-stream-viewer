
import React, { useEffect, useRef, useState } from "react";

export default function StreamPlayer({ stream, index, onTogglePlay, onDelete }) {
  const imgRef = useRef();
  const containerRef = useRef();
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!stream.playing) {
      if (wsRef.current) wsRef.current.close();
      return;
    }

    setLoading(true);
    const encodedUrl = encodeURIComponent(stream.url);
    // const ws = new WebSocket(`wss://fatmagician-rtsp-backend.hf.space/ws/stream/${encodedUrl}/`);
    const ws = new WebSocket(`ws://localhost:8000/ws/stream/${encodedUrl}/`);

    wsRef.current = ws;

    ws.onmessage = (event) => {
      imgRef.current.src = `data:image/jpeg;base64,${event.data}`;
      setLoading(false);
    };

    ws.onclose = () => setLoading(false);

    return () => {
      ws.close();
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
      className="bg-gray-800 rounded-lg shadow-lg p-2 flex flex-col items-center relative"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-lg">
          <div className="loader border-t-transparent border-solid rounded-full border-white border-4 w-8 h-8 animate-spin"></div>
        </div>
      )}
      <img
        ref={imgRef}
        alt="Live Stream"
        className="rounded-lg w-full"
        style={{ objectFit: "cover" }}
      />
      <div className="flex justify-between w-full mt-2 px-1">
        <span className="text-sm font-semibold">{stream.name}</span>
        <div className="flex gap-2">
          <button
            onClick={() => onTogglePlay(index)}
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
            onClick={() => onDelete(index)}
            className="px-2 py-1 bg-red-600 text-xs rounded hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
