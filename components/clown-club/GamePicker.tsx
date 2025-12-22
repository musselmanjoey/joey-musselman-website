'use client';

import { GameInfo } from '@/lib/clown-club/types';

interface GamePickerProps {
  games: GameInfo[];
  onSelect: (gameType: string) => void;
  onClose: () => void;
}

export function GamePicker({ games, onSelect, onClose }: GamePickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-[var(--border)]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🕹️</div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Arcade Games</h2>
          <p className="text-[var(--muted)] text-sm mt-1">Choose a game to play with everyone!</p>
        </div>

        {/* Game List */}
        <div className="space-y-3">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => onSelect(game.id)}
              className="w-full p-4 bg-gray-50 hover:bg-red-50 rounded-xl text-left transition-all hover:scale-[1.02] border border-[var(--border)] hover:border-[var(--accent)]"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">
                  {game.id === 'board-game' && '🎲'}
                  {game.id === 'caption-contest' && '📸'}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[var(--foreground)]">{game.name}</h3>
                  <p className="text-[var(--muted)] text-sm">{game.description}</p>
                  <p className="text-[var(--muted)] text-xs mt-1">
                    {game.minPlayers}-{game.maxPlayers} players
                  </p>
                </div>
                <div className="text-[var(--accent)]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-gray-100 hover:bg-gray-200 text-[var(--muted)] rounded-xl transition font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
