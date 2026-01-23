'use client';

import { useEffect, useRef, useState } from 'react';
import { BookScene } from '@/lib/book-scenes/types';
import { createDustEffect } from '@/lib/book-scenes/effects/dustParticles';
import { createPetalEffect } from '@/lib/book-scenes/effects/petalParticles';
import { createShootingStarEffect } from '@/lib/book-scenes/effects/shootingStars';
import { createMistEffect } from '@/lib/book-scenes/effects/mistEffect';

interface SceneViewerProps {
  scene: BookScene;
  fullscreen?: boolean;
}

export default function SceneViewer({ scene, fullscreen = false }: SceneViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle effects
  useEffect(() => {
    if (!canvasRef.current || !imageLoaded) return;

    const cleanups: (() => void)[] = [];

    scene.effects.forEach((effect) => {
      if (effect.type === 'dust' && canvasRef.current) {
        const cleanup = createDustEffect(canvasRef.current, effect.config);
        cleanups.push(cleanup);
      } else if (effect.type === 'petals' && canvasRef.current) {
        const cleanup = createPetalEffect(canvasRef.current, effect.config);
        cleanups.push(cleanup);
      } else if (effect.type === 'shootingStars' && canvasRef.current) {
        const cleanup = createShootingStarEffect(canvasRef.current, effect.config);
        cleanups.push(cleanup);
      } else if (effect.type === 'mist' && canvasRef.current) {
        const cleanup = createMistEffect(canvasRef.current, effect.config);
        cleanups.push(cleanup);
      }
      // Future: add rain, snow, fireflies, etc.
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [scene.effects, imageLoaded]);

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes (e.g., pressing Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcut: F for fullscreen
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-black ${
        fullscreen ? 'w-screen h-screen' : 'w-full aspect-video rounded-lg'
      }`}
    >
      {/* Background Image */}
      <img
        src={scene.image}
        alt={scene.name}
        onLoad={() => setImageLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Effects Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Fullscreen button - always visible in corner */}
      <button
        onClick={toggleFullscreen}
        className="absolute bottom-4 right-4 p-3 rounded-full bg-black/40 hover:bg-black/60 transition-all text-white/70 hover:text-white opacity-60 hover:opacity-100"
        aria-label={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
        title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
      >
        {isFullscreen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v5m0-5h5m6 10l5 5m0 0v-5m0 5h-5M9 15l-5 5m0 0h5m-5 0v-5m15-5l-5-5m0 0h5m-5 0v5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>

      {/* Loading state */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white">Loading scene...</div>
        </div>
      )}
    </div>
  );
}
