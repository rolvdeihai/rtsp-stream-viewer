import React, { useState, useEffect, useCallback } from "react";
import StreamInput from "./components/StreamInput";
import StreamGrid from "./components/StreamGrid";
import LoginPage from "./components/LoginPage";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("isAuthenticated") === "true";
  });
  
  // Use unique IDs for streams to prevent re-render issues
  const [streams, setStreams] = useState(() => {
    const saved = localStorage.getItem("streams");
    return saved ? JSON.parse(saved).map(stream => ({
      ...stream,
      id: stream.id || Date.now() + Math.random().toString(36).substr(2, 9)
    })) : [];
  });

  useEffect(() => {
    localStorage.setItem("streams", JSON.stringify(streams));
  }, [streams]);

  const handleLogin = (username, password) => {
    const correctUsername = process.env.REACT_APP_USERNAME;
    const correctPassword = process.env.REACT_APP_PASSWORD;
    
    if (username === correctUsername && password === correctPassword) {
      localStorage.setItem("isAuthenticated", "true");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
  }, []);

  // Use stable IDs for streams
  const addStream = useCallback((name, url) => {
    if (name.trim() && url.trim()) {
      setStreams(prev => [
        ...prev, 
        { 
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          name, 
          url, 
          playing: true 
        }
      ]);
    }
  }, []);

  const togglePlay = useCallback((id) => {
    setStreams(prev => 
      prev.map(s => 
        s.id === id ? { ...s, playing: !s.playing } : s
      )
    );
  }, []);

  const deleteStream = useCallback((id) => {
    setStreams(prev => prev.filter(s => s.id !== id));
  }, []);

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">🛰️ RTSP Stream Viewer</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
        
        <StreamInput onAdd={addStream} />
        <StreamGrid
          streams={streams}
          onTogglePlay={togglePlay}
          onDelete={deleteStream}
        />
      </div>
    </div>
  );
}