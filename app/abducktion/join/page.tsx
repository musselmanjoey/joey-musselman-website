'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export default function AbductionJoinPage() {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleJoin = () => {
    if (!roomCode.trim() || !playerName.trim()) {
      setError('Please enter both room code and name');
      return;
    }

    if (playerName.length > 20) {
      setError('Name must be 20 characters or less');
      return;
    }

    setIsLoading(true);
    setError('');

    const socket: Socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('join-abducktion-room', {
        roomCode: roomCode.toUpperCase().trim(),
        playerName: playerName.trim()
      });
    });

    socket.on('room-joined', (data: { roomCode: string; playerId: string }) => {
      console.log('Room joined successfully', data);
      localStorage.setItem('abducktion-room-code', data.roomCode);
      localStorage.setItem('abducktion-player-id', data.playerId);
      localStorage.setItem('abducktion-player-name', playerName.trim());
      router.push('/abducktion/play');
    });

    socket.on('error', (message: string) => {
      console.error('Error:', message);
      setError(message);
      setIsLoading(false);
      socket.disconnect();
    });

    socket.on('connect_error', () => {
      setError('Failed to connect to server');
      setIsLoading(false);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-2 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 text-transparent bg-clip-text">
            ABDUCKTION
          </h1>
          <p className="text-gray-300 text-lg">Jump. Solve. Win.</p>
        </div>

        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="space-y-6">
            <div>
              <label htmlFor="roomCode" className="block text-sm font-medium text-gray-200 mb-2">
                Room Code
              </label>
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="ABCD"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 uppercase text-center text-2xl font-bold tracking-widest"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-200 mb-2">
                Your Name
              </label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={isLoading}
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              />
              <p className="text-xs text-gray-400 mt-1">{playerName.length}/20 characters</p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={isLoading || !roomCode.trim() || !playerName.trim()}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
