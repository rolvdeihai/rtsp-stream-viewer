import React, { useState } from "react";

export default function StreamInput({ onAdd }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div className="flex flex-col md:flex-row gap-2 mb-6 w-full max-w-2xl">
      <input
        className="flex-grow p-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Stream Name"
      />
      <input
        className="flex-grow p-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="RTSP URL"
      />
      <button
        onClick={() => {
          onAdd(name, url);
          setName("");
          setUrl("");
        }}
        className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
      >
        Add
      </button>
    </div>
  );
}  