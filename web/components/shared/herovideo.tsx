'use client';

import { useEffect, useState } from 'react';

const videos = ['/videos/1.mp4', '/videos/2.mp4', '/videos/3.mp4'];

export function HeroVideo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
        setIndex((prev) => (prev + 1) % videos.length);
    }, 10_000); // mỗi 10s đổi video

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* VIDEO */}
      <video
        key={videos[index]}
        className={`absolute inset-0 w-full h-full object-cover`}
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={videos[index]} type="video/mp4" />
      </video>

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-black/10" />
    </div>
  );
}