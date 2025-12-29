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

interface SearchTrack {
  id: string;
  name: string;
  uri: string;
  artist: string;
  album: string;
  albumArt: string | null;
  duration: number;
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

type TabType = 'now-playing' | 'search';

export function PlaybackControls({ socket, onClose }: PlaybackControlsProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
  });
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('now-playing');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Queue feedback
  const [queuedTrackId, setQueuedTrackId] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Store access token for search API
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Request current playback state
    socket.emit('rs:request-state');

    const handleStateUpdate = (state: PlaybackState & { accessToken?: string }) => {
      setPlaybackState(state);
      if (state.authenticated !== undefined) {
        setAuthenticated(state.authenticated !== false);
      }
      if (state.accessToken) {
        setAccessToken(state.accessToken);
      }
    };

    const handleQueueAdded = (data: { uri: string }) => {
      // Find track by URI and show success
      const track = searchResults.find((t) => t.uri === data.uri);
      if (track) {
        setQueuedTrackId(track.id);
        setTimeout(() => setQueuedTrackId(null), 2000);
      }
    };

    const handleError = (data: { error: string }) => {
      setQueueError(data.error);
      setTimeout(() => setQueueError(null), 3000);
    };

    socket.on('rs:state-update', handleStateUpdate);
    socket.on('rs:queue-added', handleQueueAdded);
    socket.on('rs:error', handleError);

    return () => {
      socket.off('rs:state-update', handleStateUpdate);
      socket.off('rs:queue-added', handleQueueAdded);
      socket.off('rs:error', handleError);
    };
  }, [socket, searchResults]);

  // Debounced search
  const searchTracks = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (!accessToken) {
      setSearchError('Spotify not connected');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(query)}&access_token=${encodeURIComponent(accessToken)}&limit=10`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Search failed');
      }

      const data = await response.json();
      setSearchResults(data.tracks || []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [accessToken]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchTracks(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchTracks]);

  const handleQueueTrack = (track: SearchTrack) => {
    socket.emit('rs:queue-track', { uri: track.uri });
  };

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

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] rounded-xl max-w-md w-full shadow-2xl border border-[#3d3d5c] overflow-hidden max-h-[90vh] flex flex-col">
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

        {/* Tabs */}
        <div className="flex border-b border-[#3d3d5c]">
          <button
            onClick={() => setActiveTab('now-playing')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === 'now-playing'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Now Playing
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === 'search'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Search & Queue
          </button>
        </div>

        {/* Queue Error Toast */}
        {queueError && (
          <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {queueError}
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'now-playing' ? (
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
          ) : (
            /* Search Tab */
            <div className="p-4">
              {/* Search Input */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search for a song..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-[#2a2a4a] border border-[#3d3d5c] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition"
                  disabled={!authenticated}
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Search Error */}
              {searchError && (
                <p className="text-red-400 text-sm mb-4">{searchError}</p>
              )}

              {/* Not Connected Message */}
              {!authenticated && (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🔌</div>
                  <p className="text-gray-400">Spotify not connected</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Room host needs to connect Spotify to enable search
                  </p>
                </div>
              )}

              {/* Search Results */}
              {authenticated && searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 p-2 bg-[#2a2a4a] rounded-lg hover:bg-[#3a3a5a] transition group"
                    >
                      {/* Album Art */}
                      <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-[#3d3d5c]">
                        {track.albumArt ? (
                          <img
                            src={track.albumArt}
                            alt={track.album}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            💿
                          </div>
                        )}
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {track.name}
                        </p>
                        <p className="text-gray-400 text-xs truncate">
                          {track.artist}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatDuration(track.duration)}
                        </p>
                      </div>

                      {/* Queue Button */}
                      <button
                        onClick={() => handleQueueTrack(track)}
                        disabled={queuedTrackId === track.id}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                          queuedTrackId === track.id
                            ? 'bg-green-500 text-white'
                            : 'bg-[#3d3d5c] text-gray-300 hover:bg-green-500 hover:text-white'
                        }`}
                      >
                        {queuedTrackId === track.id ? 'Added!' : '+ Queue'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {authenticated && searchQuery && !isSearching && searchResults.length === 0 && !searchError && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="text-gray-400">No results found</p>
                </div>
              )}

              {/* Initial State */}
              {authenticated && !searchQuery && (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🎶</div>
                  <p className="text-gray-400">Search for songs to add to the queue</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Songs will play after the current track
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
