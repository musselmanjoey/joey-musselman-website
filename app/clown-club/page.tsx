'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnter = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    sessionStorage.setItem('playerName', playerName.trim());
    // Everyone joins the same persistent "LOBBY" world
    router.push('/clown-club/world/LOBBY');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-sky-400 to-sky-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold text-center mb-2">
          <span className="text-6xl">🤡</span>
        </h1>
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
          Clown Club
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={20}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <button
            onClick={handleEnter}
            disabled={isLoading}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {isLoading ? 'Entering...' : 'Enter World'}
          </button>
        </div>

        <p className="mt-6 text-center text-gray-500 text-sm">
          Join everyone in the same world!
        </p>
      </div>

      <p className="mt-8 text-white/80 text-sm">
        A Club Penguin-style virtual world
      </p>
    </main>
  );
}
