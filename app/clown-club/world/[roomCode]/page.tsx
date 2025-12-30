'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { connectSocket, resetSocket } from '@/lib/clown-club/socket';
import { Socket } from 'socket.io-client';
import { GamePicker } from '@/components/clown-club/GamePicker';
import { VinylBrowser, PlaybackControls, ReviewPanel } from '@/components/clown-club/record-store';
import { GameInfo, GameStartedData } from '@/lib/clown-club/types';
import { gameEvents } from '@/lib/clown-club/gameEvents';

// Declare global crown debug values
declare global {
  interface Window {
    crownDebug?: {
      crownY: number;
      crownScale: number;
      sideOffsetX: number;
      sideOffsetY: number;
    };
  }
}

// Dynamic import for Phaser (client-only)
const PhaserWrapper = dynamic(
  () => import('@/lib/clown-club/phaser/PhaserWrapper').then((mod) => mod.PhaserWrapper),
  { ssr: false, loading: () => <LoadingScreen /> }
);

function LoadingScreen() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="text-6xl mb-4">🤡</div>
        <p className="text-[var(--foreground)] text-xl">Loading world...</p>
      </div>
    </div>
  );
}

// Crown Debug Panel Component
function CrownDebugPanel({
  values,
  onChange,
  onClose,
}: {
  values: { crownY: number; crownScale: number; sideOffsetX: number; sideOffsetY: number };
  onChange: (values: { crownY: number; crownScale: number; sideOffsetX: number; sideOffsetY: number }) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed top-16 left-4 z-50 bg-black/90 text-white p-4 rounded-lg w-64 text-sm">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold">Crown Debug</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white">X</button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Y Position: {values.crownY}</label>
          <input
            type="range"
            min="-60"
            max="0"
            value={values.crownY}
            onChange={(e) => onChange({ ...values, crownY: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Scale: {values.crownScale.toFixed(2)}</label>
          <input
            type="range"
            min="0.2"
            max="0.8"
            step="0.02"
            value={values.crownScale}
            onChange={(e) => onChange({ ...values, crownScale: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Side X Offset: {values.sideOffsetX}</label>
          <input
            type="range"
            min="-10"
            max="10"
            value={values.sideOffsetX}
            onChange={(e) => onChange({ ...values, sideOffsetX: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Side Y Offset: {values.sideOffsetY}</label>
          <input
            type="range"
            min="0"
            max="20"
            value={values.sideOffsetY}
            onChange={(e) => onChange({ ...values, sideOffsetY: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>
      <div className="mt-3 p-2 bg-gray-800 rounded text-xs font-mono">
        crownY: {values.crownY}, scale: {values.crownScale.toFixed(2)}<br/>
        sideX: {values.sideOffsetX}, sideY: {values.sideOffsetY}
      </div>
    </div>
  );
}

export default function WorldPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = params.roomCode as string;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Game state
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [availableGames, setAvailableGames] = useState<GameInfo[]>([]);
  const [inGame, setInGame] = useState(false);

  // Record Store state
  const [showVinylBrowser, setShowVinylBrowser] = useState(false);
  const [showPlaybackControls, setShowPlaybackControls] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [reviewAlbumId, setReviewAlbumId] = useState<number | undefined>();

  // Crown debug state (use ?debug=crown to show panel)
  const [showCrownDebug, setShowCrownDebug] = useState(searchParams.get('debug') === 'crown');
  const [crownValues, setCrownValues] = useState({
    crownY: -35,
    crownScale: 0.48,
    sideOffsetX: 7,
    sideOffsetY: 3,
  });

  // Update global crown debug values when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.crownDebug = crownValues;
    }
  }, [crownValues]);

  useEffect(() => {
    // Get player info from session storage
    const storedName = sessionStorage.getItem('playerName');
    const storedColor = sessionStorage.getItem('playerColor') || 'white';
    const storedVIP = sessionStorage.getItem('isVIP') === 'true';

    if (!storedName) {
      // Redirect to home if no player name
      router.push('/clown-club');
      return;
    }

    setPlayerName(storedName);

    // Convert color to sprite key (e.g., 'white' -> 'clown-white')
    const spriteKey = `clown-${storedColor}`;

    // Connect socket
    const s = connectSocket();
    setSocket(s);

    // Handle connection - join the room when connected
    const handleConnected = () => {
      setPlayerId(s.id || '');
      setIsConnected(true);
      // Join/rejoin the room with sprite key and VIP status
      s.emit('cc:join-room', {
        roomCode: roomCode.toUpperCase(),
        playerName: storedName,
        character: spriteKey,
        isVIP: storedVIP,
      });
    };

    // If already connected, join immediately
    if (s.connected) {
      handleConnected();
    }

    s.on('connect', handleConnected);

    s.on('cc:error', ({ message }: { message: string }) => {
      setError(message);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      s.off('connect', handleConnected);
      s.off('cc:error');
      s.off('disconnect');
      // Reset socket completely when leaving the world
      resetSocket();
    };
  }, [roomCode, router]);

  // Listen to Phaser game events
  useEffect(() => {
    const handleShowGamePicker = (games: GameInfo[]) => {
      setAvailableGames(games);
      setShowGamePicker(true);
    };

    const handleGameStarted = (data: GameStartedData) => {
      setShowGamePicker(false);
      setInGame(true);
    };

    const handleGameEnded = () => {
      setInGame(false);
    };

    gameEvents.on('show-game-picker', handleShowGamePicker);
    gameEvents.on('game-started', handleGameStarted);
    gameEvents.on('game-ended', handleGameEnded);

    // Record Store events
    const handleShowVinylBrowser = () => {
      setShowVinylBrowser(true);
    };

    const handleShowControls = () => {
      setShowPlaybackControls(true);
    };

    const handleShowReviews = () => {
      setReviewAlbumId(undefined); // Show reviews list
      setShowReviewPanel(true);
    };

    const handleShowReview = (data: { albumId: number }) => {
      setReviewAlbumId(data.albumId);
      setShowReviewPanel(true);
    };

    gameEvents.on('rs:show-vinyl-browser', handleShowVinylBrowser);
    gameEvents.on('rs:show-controls', handleShowControls);
    gameEvents.on('rs:show-reviews', handleShowReviews);
    gameEvents.on('rs:show-review', handleShowReview);

    // Also listen to socket for game:ended and errors
    if (socket) {
      socket.on('game:ended', handleGameEnded);
      socket.on('game:left', handleGameEnded);
      socket.on('game:error', (data: { message: string }) => {
        console.error('[Game Error]', data.message);
        alert(`Game error: ${data.message}`);
        setShowGamePicker(false);
      });
    }

    return () => {
      gameEvents.off('show-game-picker', handleShowGamePicker);
      gameEvents.off('game-started', handleGameStarted);
      gameEvents.off('game-ended', handleGameEnded);
      gameEvents.off('rs:show-vinyl-browser', handleShowVinylBrowser);
      gameEvents.off('rs:show-controls', handleShowControls);
      gameEvents.off('rs:show-reviews', handleShowReviews);
      gameEvents.off('rs:show-review', handleShowReview);
      if (socket) {
        socket.off('game:ended', handleGameEnded);
        socket.off('game:left', handleGameEnded);
        socket.off('game:error');
      }
    };
  }, [socket]);

  const handleGameSelect = (gameType: string) => {
    console.log('[Clown Club] Starting game:', gameType);
    if (socket) {
      socket.emit('game:start', { gameType });
    }
    setShowGamePicker(false);
  };

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white">
        <div className="bg-white rounded-xl p-8 text-center max-w-md border border-[var(--border)]">
          <div className="text-4xl mb-4">😢</div>
          <h2 className="text-xl font-bold mb-2">Oops!</h2>
          <p className="text-[var(--muted)] mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)]"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!socket || !isConnected || !playerId) {
    return <LoadingScreen />;
  }

  return (
    <div className="game-container">
      {/* Crown Debug Panel */}
      {showCrownDebug && (
        <CrownDebugPanel
          values={crownValues}
          onChange={setCrownValues}
          onClose={() => setShowCrownDebug(false)}
        />
      )}

      {/* Game Picker Modal */}
      {showGamePicker && (
        <GamePicker
          games={availableGames}
          onSelect={handleGameSelect}
          onClose={() => setShowGamePicker(false)}
        />
      )}

      {/* Record Store Overlays */}
      {showVinylBrowser && socket && (
        <VinylBrowser
          socket={socket}
          onClose={() => setShowVinylBrowser(false)}
          onViewReview={(albumId) => {
            setShowVinylBrowser(false);
            setReviewAlbumId(albumId);
            setShowReviewPanel(true);
          }}
        />
      )}

      {showPlaybackControls && socket && (
        <PlaybackControls
          socket={socket}
          onClose={() => setShowPlaybackControls(false)}
        />
      )}

      {showReviewPanel && socket && (
        <ReviewPanel
          socket={socket}
          albumId={reviewAlbumId}
          onClose={() => {
            setShowReviewPanel(false);
            setReviewAlbumId(undefined);
          }}
        />
      )}

      {/* Room code display - hide during games */}
      {!inGame && (
        <div className="fixed top-4 left-4 z-10 bg-black/50 text-white px-4 py-2 rounded-lg">
          <span className="text-sm opacity-70">Room:</span>{' '}
          <span className="font-mono font-bold">{roomCode.toUpperCase()}</span>
        </div>
      )}

      {/* Connection status */}
      <div className="fixed top-4 right-4 z-10">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      {/* Chat input - hide during games */}
      {!inGame && (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-10">
        {isChatOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (chatMessage.trim()) {
                socket.emit('cc:chat', { message: chatMessage.trim() });
                setChatMessage('');
                setIsChatOpen(false);
              }
            }}
            className="flex gap-2"
          >
            <input
              ref={chatInputRef}
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={100}
              className="px-4 py-2 rounded-full bg-white/95 shadow-lg w-64 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              autoFocus
              onBlur={() => {
                if (!chatMessage.trim()) {
                  setIsChatOpen(false);
                }
              }}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-full shadow-lg hover:bg-[var(--accent-hover)] transition"
            >
              Send
            </button>
          </form>
        ) : (
          <button
            onClick={() => {
              setIsChatOpen(true);
              setTimeout(() => chatInputRef.current?.focus(), 100);
            }}
            className="px-6 py-2 bg-white/90 rounded-full shadow-lg text-sm hover:bg-white transition"
          >
            💬 Chat
          </button>
        )}
      </div>
      )}

      {/* Emote buttons - hide during games */}
      {!inGame && (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {['wave', 'dance', 'laugh', 'heart'].map((emote) => (
          <button
            key={emote}
            onClick={() => socket.emit('cc:emote', { emoteId: emote })}
            className="w-12 h-12 bg-white/90 rounded-full shadow-lg text-2xl hover:scale-110 transition"
          >
            {emote === 'wave' && '👋'}
            {emote === 'dance' && '💃'}
            {emote === 'laugh' && '😂'}
            {emote === 'heart' && '❤️'}
          </button>
        ))}
      </div>
      )}

      {/* Phaser game */}
      <PhaserWrapper socket={socket} playerId={playerId} playerName={playerName} />
    </div>
  );
}
