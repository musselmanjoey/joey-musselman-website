'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (playerName.length > 20) {
      setError('Name must be 20 characters or less');
      return;
    }

    // Navigate to play page with params
    router.push(`/game/play?room=${roomCode.toUpperCase()}&name=${encodeURIComponent(playerName)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="glass-strong rounded-3xl p-8 md:p-12 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4">
            <span className="gradient-text">Join Game</span>
          </h1>
          <p className="text-white/60 text-lg">Enter the room code to join</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          {/* Room Code Input */}
          <div>
            <label htmlFor="roomCode" className="block text-white/80 text-sm font-medium mb-2">
              Room Code
            </label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setError('');
              }}
              maxLength={4}
              placeholder="ABCD"
              className="w-full px-6 py-4 text-center text-3xl font-bold tracking-widest bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-circus-red transition-colors uppercase"
              autoComplete="off"
            />
          </div>

          {/* Player Name Input */}
          <div>
            <label htmlFor="playerName" className="block text-white/80 text-sm font-medium mb-2">
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError('');
              }}
              maxLength={20}
              placeholder="Enter your name"
              className="w-full px-6 py-4 text-xl bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-circus-red transition-colors"
              autoComplete="off"
            />
            <p className="text-white/40 text-sm mt-2">
              {playerName.length}/20 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="glass-strong border-2 border-red-500 rounded-xl p-4">
              <p className="text-red-400 text-center">{error}</p>
            </div>
          )}

          {/* Join Button */}
          <button
            type="submit"
            className="w-full px-8 py-5 bg-gradient-to-r from-circus-red to-orange-500 rounded-full text-xl font-bold hover:scale-105 transition-transform glow"
          >
            Join Game
          </button>
        </form>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <a href="/" className="text-white/60 hover:text-white transition-colors">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
