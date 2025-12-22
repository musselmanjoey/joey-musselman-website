'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

const EMOJI_OPTIONS = [
  '🤡', '🐸', '🐱', '🐶', '🦊', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐵', '🐰', '🐻', '🐔', '🦄',
];

const VIP_SECRET = 'CLOWNKING';

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [playerName, setPlayerName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🤡');
  const [isVIP, setIsVIP] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    const trimmedName = playerName.trim().slice(0, 8);
    sessionStorage.setItem('playerName', trimmedName);
    sessionStorage.setItem('playerEmoji', selectedEmoji);
    sessionStorage.setItem('isVIP', isVIP ? 'true' : 'false');

    router.push('/clown-club/world/LOBBY');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
      {/* Logo */}
      <div className="mb-8">
        <Image
          src="/images/clowncode-logo.png"
          alt="Clown Code"
          width={280}
          height={96}
          priority
        />
      </div>

      <div className="w-full max-w-sm">
        {/* Selected character display */}
        <div className="text-center mb-6">
          <span className="text-7xl">{selectedEmoji}</span>
          {isVIP && <span className="text-5xl ml-2">👑</span>}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-[var(--accent)] text-[var(--accent)] rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Emoji Picker */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Choose Your Character
            </label>
            <div className="grid grid-cols-8 gap-1 p-2 border border-[var(--border)] rounded-xl">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-2xl p-1.5 rounded-lg transition ${
                    selectedEmoji === emoji
                      ? 'bg-red-50 ring-2 ring-[var(--accent)]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 8))}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
              placeholder="Max 8 characters"
              className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none transition"
              maxLength={8}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <button
            onClick={handleEnter}
            disabled={isLoading}
            className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition disabled:opacity-50"
          >
            {isLoading ? 'Entering...' : 'Enter World'}
          </button>
        </div>

        <p className="mt-6 text-center text-[var(--muted)] text-sm">
          A multiplayer virtual hangout
        </p>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-[var(--muted)] text-xl">Loading...</div>
      </main>
    }>
      <HomePageContent />
    </Suspense>
  );
}
