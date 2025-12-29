'use client';

import { useEffect, useState, useCallback } from 'react';
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
  device?: string;
}

interface HostPlaybackControlsProps {
  socket: Socket;
  onClose: () => void;
}

export function HostPlaybackControls({ socket, onClose }: HostPlaybackControlsProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
  });
  const [authenticated, setAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for OAuth callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spotifyAuth = params.get('spotify_auth');

    if (spotifyAuth === 'success') {
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
      // Fetch tokens from cookie and send to server
      fetchAndSendTokens();
    }
  }, []);

  const fetchAndSendTokens = async () => {
    try {
      const response = await fetch('/api/spotify/token');
      if (!response.ok) {
        throw new Error('Failed to get tokens');
      }
      const tokens = await response.json();

      // Send tokens to server
      socket.emit('rs:authenticate', { tokens });
      setAuthenticated(true);
    } catch (err) {
      setError('Failed to complete Spotify connection');
    }
  };

  useEffect(() => {
    // Request current playback state
    socket.emit('rs:request-state');

    const handleStateUpdate = (state: PlaybackState & { authenticated?: boolean }) => {
      setPlaybackState(state);
      if (state.authenticated !== undefined) {
        setAuthenticated(state.authenticated !== false);
      }
    };

    const handleAuthComplete = () => {
      setAuthenticated(true);
      setIsConnecting(false);
    };

    const handleError = (data: { error: string }) => {
      setError(data.error);
      setIsConnecting(false);
    };

    socket.on('rs:state-update', handleStateUpdate);
    socket.on('rs:auth-complete', handleAuthComplete);
    socket.on('rs:error', handleError);

    return () => {
      socket.off('rs:state-update', handleStateUpdate);
      socket.off('rs:auth-complete', handleAuthComplete);
      socket.off('rs:error', handleError);
    };
  }, [socket]);

  const handleConnectSpotify = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get auth URL from our API
      console.log('[DJ Booth] Fetching Spotify auth URL...');
      const response = await fetch('/api/spotify/auth?roomCode=LOBBY');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[DJ Booth] Auth request failed:', response.status, errorData);
        throw new Error(errorData.error || `Auth request failed: ${response.status}`);
      }

      const { authUrl } = await response.json();
      console.log('[DJ Booth] Redirecting to Spotify...');

      // Redirect to Spotify
      window.location.href = authUrl;
    } catch (err) {
      console.error('[DJ Booth] Spotify connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start Spotify connection');
      setIsConnecting(false);
    }
  }, []);

  const handlePlay = () => socket.emit('rs:play', {});
  const handlePause = () => socket.emit('rs:pause');
  const handleSkip = () => socket.emit('rs:skip');
  const handlePrevious = () => socket.emit('rs:previous');

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
            {authenticated && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                Connected
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-2"
          >
            ✕
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="p-6">
          {!authenticated ? (
            /* Spotify Connect */
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎵</div>
              <h3 className="text-white font-bold text-lg mb-2">Connect Spotify</h3>
              <p className="text-gray-400 text-sm mb-6">
                Connect your Spotify account to control playback and let guests queue songs
              </p>
              <button
                onClick={handleConnectSpotify}
                disabled={isConnecting}
                className="px-6 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {isConnecting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Connect with Spotify
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Now Playing */
            <>
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
                  <p className="text-gray-400">No track playing</p>
                  <p className="text-gray-500 text-sm mt-2">
                    {playbackState.device
                      ? `Playing on: ${playbackState.device}`
                      : 'Start playing on Spotify to see it here'}
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

              {/* Help Text */}
              <p className="text-center text-gray-500 text-sm mt-6">
                Guests can search and queue songs from their phones
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
