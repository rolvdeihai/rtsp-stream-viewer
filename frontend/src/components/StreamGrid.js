import React from "react";
import StreamPlayer from "./StreamPlayer";

export default function StreamGrid({ streams, onTogglePlay, onDelete }) {
  if (streams.length === 0) {
    return (
      <p className="text-gray-400 mt-10">
        No streams added yet. Enter a name and RTSP link above to start.
      </p>
    );
  }

  const maxColumns = 3;
  const count = streams.length;

  const columns = Math.min(Math.ceil(Math.sqrt(count)), maxColumns);

  return (
    <div
      className="grid gap-4 w-full max-w-6xl"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {streams.map((stream) => (
        <StreamPlayer
          key={stream.id}
          stream={stream}
          onTogglePlay={() => onTogglePlay(stream.id)}
          onDelete={() => onDelete(stream.id)}
        />
      ))}
    </div>
  );
}
