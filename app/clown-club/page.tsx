'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

// Clown color options (matches AssetRegistry)
const CLOWN_COLORS = [
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  { id: 'garnet', name: 'Garnet', hex: '#800020' },
  { id: 'blue', name: 'Blue', hex: '#6495ED' },
  { id: 'pink', name: 'Pink', hex: '#FFB6C1' },
  { id: 'green', name: 'Green', hex: '#90EE90' },
  { id: 'yellow', name: 'Yellow', hex: '#FFFF96' },
  { id: 'purple', name: 'Purple', hex: '#BA87CE' },
  { id: 'orange', name: 'Orange', hex: '#FFC864' },
];

const VIP_SECRET = 'CLOWNKING';

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [playerName, setPlayerName] = useState('');
  const [selectedColor, setSelectedColor] = useState('white');
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
    sessionStorage.setItem('playerColor', selectedColor);
    sessionStorage.setItem('isVIP', isVIP ? 'true' : 'false');

    router.push('/clown-club/world/LOBBY');
  };

  const selectedColorData = CLOWN_COLORS.find(c => c.id === selectedColor);

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
        {/* Selected character preview */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            {/* Clown preview - body with selected color */}
            <div
              className="w-24 h-24 rounded-full border-4 border-black mx-auto relative"
              style={{ backgroundColor: selectedColorData?.hex }}
            >
              {/* Face */}
              <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 flex gap-3">
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
              </div>
              {/* Red nose */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/4 w-4 h-4 bg-red-500 rounded-full"></div>
            </div>
            {isVIP && <span className="absolute -top-2 -right-2 text-3xl">👑</span>}
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">{selectedColorData?.name} Clown</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-[var(--accent)] text-[var(--accent)] rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Choose Your Color
            </label>
            <div className="grid grid-cols-4 gap-2 p-3 border border-[var(--border)] rounded-xl">
              {CLOWN_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`aspect-square rounded-full border-2 transition transform hover:scale-110 ${
                    selectedColor === color.id
                      ? 'ring-2 ring-[var(--accent)] ring-offset-2 border-black'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                  data-testid={`color-${color.id}`}
                />
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
              data-testid="player-name-input"
            />
          </div>

          <button
            onClick={handleEnter}
            disabled={isLoading}
            className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl transition disabled:opacity-50"
            data-testid="enter-world-button"
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
