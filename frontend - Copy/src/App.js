import React, { useState, useEffect } from "react";
import StreamInput from "./components/StreamInput";
import StreamGrid from "./components/StreamGrid";

export default function App() {
  const [streams, setStreams] = useState(() => {
    const saved = localStorage.getItem("streams");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("streams", JSON.stringify(streams));
  }, [streams]);

  const addStream = (name, url) => {
    if (name.trim() && url.trim()) {
      setStreams((prev) => [...prev, { name, url, playing: true }]);
    }
  };

  const togglePlay = (index) => {
    setStreams((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, playing: !s.playing } : s
      )
    );
  };

  const deleteStream = (index) => {
    setStreams((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-4">:satellite: RTSP Stream Viewer</h1>
      <StreamInput onAdd={addStream} />
      <StreamGrid
        streams={streams}
        onTogglePlay={togglePlay}
        onDelete={deleteStream}
      />
    </div>
  );
}
