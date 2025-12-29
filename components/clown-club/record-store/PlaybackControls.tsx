'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt?: string;
  duration: number;
  progress: number;
}

interface PlaybackState {
  isPlaying: boolean;
  track?: Track;
  authenticated?: boolean;
}

interface PlaybackControlsProps {
  socket: Socket;
  onClose: () => void;
}

export function PlaybackControls({ socket, onClose }: PlaybackControlsProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
  });
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Request current playback state
    socket.emit('rs:request-state');

    const handleStateUpdate = (state: PlaybackState) => {
      setPlaybackState(state);
      if (state.authenticated !== undefined) {
        setAuthenticated(state.authenticated);
      }
    };

    socket.on('rs:state-update', handleStateUpdate);

    return () => {
      socket.off('rs:state-update', handleStateUpdate);
    };
  }, [socket]);

  const handlePlay = () => {
    socket.emit('rs:play', {});
  };

  const handlePause = () => {
    socket.emit('rs:pause');
  };

  const handleSkip = () => {
    socket.emit('rs:skip');
  };

  const handlePrevious = () => {
    socket.emit('rs:previous');
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = playbackState.track
    ? (playbackState.track.progress / playbackState.track.duration) * 100
    : 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] rounded-xl max-w-md w-full shadow-2xl border border-[#3d3d5c] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3d3d5c]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎧</span>
            <h2 className="text-xl font-bold text-white">DJ Booth</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-2"
          >
            ✕
          </button>
        </div>

        {/* Album Art / Now Playing */}
        <div className="p-6">
          {playbackState.track ? (
            <>
              {/* Album Art */}
              <div className="aspect-square max-w-[200px] mx-auto mb-4 rounded-lg overflow-hidden shadow-lg">
                {playbackState.track.albumArt ? (
                  <img
                    src={playbackState.track.albumArt}
                    alt={playbackState.track.album}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#3d3d5c] flex items-center justify-center">
                    <span className="text-6xl">💿</span>
                  </div>
                )}
              </div>

              {/* Track Info */}
              <div className="text-center mb-4">
                <h3 className="text-white font-bold text-lg truncate">
                  {playbackState.track.name}
                </h3>
                <p className="text-gray-400 truncate">{playbackState.track.artist}</p>
                <p className="text-gray-500 text-sm truncate">{playbackState.track.album}</p>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-1 bg-[#3d3d5c] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-1000"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatTime(playbackState.track.progress)}</span>
                  <span>{formatTime(playbackState.track.duration)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-gray-400">
                {authenticated ? 'No track playing' : 'Spotify not connected'}
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrevious}
              className="p-3 text-gray-400 hover:text-white transition rounded-full hover:bg-[#3d3d5c]"
              title="Previous"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={playbackState.isPlaying ? handlePause : handlePlay}
              className="p-4 bg-white text-black rounded-full hover:scale-105 transition shadow-lg"
              title={playbackState.isPlaying ? 'Pause' : 'Play'}
            >
              {playbackState.isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={handleSkip}
              className="p-3 text-gray-400 hover:text-white transition rounded-full hover:bg-[#3d3d5c]"
              title="Skip"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          {/* Spotify Link */}
          {!authenticated && (
            <p className="text-center text-gray-500 text-sm mt-4">
              Room host needs to connect Spotify
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
