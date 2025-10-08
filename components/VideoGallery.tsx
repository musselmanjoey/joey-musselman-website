'use client';

import { useState } from 'react';

interface VideoGalleryProps {
  videos: string[];
  title?: string;
}

export default function VideoGallery({ videos, title }: VideoGalleryProps) {
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {title && (
        <h3 className="text-2xl font-bold text-white mb-6">{title}</h3>
      )}

      {/* Lightbox for full video */}
      {activeVideo !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
             onClick={() => setActiveVideo(null)}>
          <button
            onClick={() => setActiveVideo(null)}
            className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center glass-strong rounded-full hover:bg-white/20 transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="w-full max-w-6xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <iframe
              className="w-full h-full rounded-2xl"
              src={`https://www.youtube.com/embed/${videos[activeVideo]}?autoplay=1`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {videos.map((videoId, index) => (
          <div
            key={index}
            className="group relative rounded-2xl overflow-hidden cursor-pointer glow-hover"
            onClick={() => setActiveVideo(index)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              animation: 'fadeInUp 0.6s ease-out',
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'both',
            }}
          >
            <div className="relative aspect-video">
              {/* Thumbnail */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{
                  backgroundImage: `url(https://img.youtube.com/vi/${videoId}/maxresdefault.jpg)`,
                }}
              ></div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>

              {/* Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-20 h-20 bg-circus-red rounded-full flex items-center justify-center transition-all duration-300 glow ${
                  hoveredIndex === index ? 'scale-125' : 'scale-100'
                }`}>
                  <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>

              {/* Video Number Badge */}
              <div className="absolute top-4 left-4 glass px-3 py-1 rounded-full text-sm font-medium">
                Video {index + 1}
              </div>
            </div>

            {/* Animated Border */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-circus-red/50 rounded-2xl transition-all duration-300"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
