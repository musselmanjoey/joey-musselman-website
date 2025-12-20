'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { connectSocket, resetSocket } from '@/lib/clown-club/socket';
import { Socket } from 'socket.io-client';
import { GamePicker } from '@/components/clown-club/GamePicker';
import { GameInfo, GameStartedData } from '@/lib/clown-club/types';
import { gameEvents } from '@/lib/clown-club/gameEvents';

// Dynamic import for Phaser (client-only)
const PhaserWrapper = dynamic(
  () => import('@/lib/clown-club/phaser/PhaserWrapper').then((mod) => mod.PhaserWrapper),
  { ssr: false, loading: () => <LoadingScreen /> }
);

function LoadingScreen() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-sky-400">
      <div className="text-center">
        <div className="text-6xl mb-4">🤡</div>
        <p className="text-white text-xl">Loading world...</p>
      </div>
    </div>
  );
}

export default function WorldPage() {
  const params = useParams();
  const router = useRouter();
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

  useEffect(() => {
    // Get player info from session storage
    const storedName = sessionStorage.getItem('playerName');

    if (!storedName) {
      // Redirect to home if no player name
      router.push('/clown-club');
      return;
    }

    setPlayerName(storedName);

    // Connect socket
    const s = connectSocket();
    setSocket(s);

    // Handle connection - join the room when connected
    const handleConnected = () => {
      setPlayerId(s.id || '');
      setIsConnected(true);
      // Join/rejoin the room (handles both fresh join and reconnection)
      s.emit('cc:join-room', { roomCode: roomCode.toUpperCase(), playerName: storedName });
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
      <div className="w-full h-screen flex items-center justify-center bg-sky-400">
        <div className="bg-white rounded-xl p-8 text-center max-w-md">
          <div className="text-4xl mb-4">😢</div>
          <h2 className="text-xl font-bold mb-2">Oops!</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
      {/* Game Picker Modal */}
      {showGamePicker && (
        <GamePicker
          games={availableGames}
          onSelect={handleGameSelect}
          onClose={() => setShowGamePicker(false)}
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
              className="px-4 py-2 rounded-full bg-white/95 shadow-lg w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
              onBlur={() => {
                if (!chatMessage.trim()) {
                  setIsChatOpen(false);
                }
              }}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition"
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
