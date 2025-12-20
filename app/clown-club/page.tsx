'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const EMOJI_OPTIONS = [
  '🤡', '🐸', '🐱', '🐶', '🦊', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐵', '🐰', '🐻', '🐔', '🦄',
];

const VIP_SECRET = 'CLOWNKING'; // Secret key for crown access

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [playerName, setPlayerName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🤡');
  const [isVIP, setIsVIP] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for VIP param on mount
  useEffect(() => {
    const vipParam = searchParams.get('vip');
    if (vipParam === VIP_SECRET) {
      setIsVIP(true);
    }
  }, [searchParams]);

  const handleEnter = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    // Limit name to 8 chars and store
    const trimmedName = playerName.trim().slice(0, 8);
    sessionStorage.setItem('playerName', trimmedName);
    sessionStorage.setItem('playerEmoji', selectedEmoji);
    sessionStorage.setItem('isVIP', isVIP ? 'true' : 'false');

    // Everyone joins the same persistent "LOBBY" world
    router.push('/clown-club/world/LOBBY');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-sky-400 to-sky-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        {/* Header with selected emoji */}
        <div className="text-center mb-4">
          <span className="text-6xl">{selectedEmoji}</span>
          {isVIP && <span className="text-4xl ml-1">👑</span>}
        </div>
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Clown Club
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Emoji Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Your Character
            </label>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-2xl p-1 rounded-lg transition hover:bg-gray-100 ${
                    selectedEmoji === emoji
                      ? 'bg-blue-100 ring-2 ring-blue-500'
                      : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name (max 8 chars)
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 8))}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={8}
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

        <p className="mt-4 text-center text-gray-500 text-sm">
          Join everyone in the same world!
        </p>
      </div>

      <p className="mt-6 text-white/80 text-sm">
        A Club Penguin-style virtual world
      </p>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-400 to-sky-200">
        <div className="text-white text-xl">Loading...</div>
      </main>
    }>
      <HomePageContent />
    </Suspense>
  );
}
