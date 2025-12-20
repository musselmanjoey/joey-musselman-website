'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useSocket } from '../components/SocketProvider';
import { ConnectionStatus } from '../components/ConnectionStatus';

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket, isConnected } = useSocket();

  const [roomCode, setRoomCode] = useState(searchParams.get('code') || '');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    function onJoinedRoom({ roomCode: code }: { roomCode: string }) {
      sessionStorage.setItem('playerRoomCode', code);
      sessionStorage.setItem('playerName', playerName);
      router.push(`/party/play/${code}`);
    }

    function onError({ message }: { message: string }) {
      setError(message);
      setIsJoining(false);
    }

    socket.on('joined-room', onJoinedRoom);
    socket.on('error', onError);

    return () => {
      socket.off('joined-room', onJoinedRoom);
      socket.off('error', onError);
    };
  }, [socket, router, playerName]);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!socket || !isConnected) return;
    if (!roomCode.trim() || !playerName.trim()) return;

    setError(null);
    setIsJoining(true);
    socket.emit('join-room', {
      roomCode: roomCode.toUpperCase(),
      playerName: playerName.trim(),
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <ConnectionStatus />

      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/images/clowncode-logo.png"
          alt="Clown Code"
          width={300}
          height={100}
          className="rounded-lg"
          priority
        />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 text-white">Join Game</h1>
        <p className="text-gray-400">Enter the room code shown on the TV</p>
      </div>

      <form onSubmit={handleJoin} className="w-full max-w-sm space-y-4">
        {/* Room Code Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Room Code</label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
            maxLength={4}
            className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl px-4 py-3
                       text-center text-3xl font-mono tracking-[0.3em] uppercase
                       focus:border-accent focus:outline-none transition-colors"
          />
        </div>

        {/* Player Name Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl px-4 py-3
                       text-center text-xl
                       focus:border-accent focus:outline-none transition-colors"
          />
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isConnected || isJoining || !roomCode.trim() || !playerName.trim()}
          className={`
            w-full bg-accent hover:bg-accent-hover text-white font-semibold
            py-4 rounded-xl text-lg transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isJoining ? 'animate-pulse' : ''}
          `}
        >
          {isJoining ? 'Joining...' : 'Join Game'}
        </button>
      </form>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
