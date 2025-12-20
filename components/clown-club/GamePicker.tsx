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
      <div className="bg-gradient-to-b from-indigo-900 to-purple-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-purple-500/30">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🕹️</div>
          <h2 className="text-2xl font-bold text-white">Arcade Games</h2>
          <p className="text-purple-200 text-sm mt-1">Choose a game to play with everyone!</p>
        </div>

        {/* Game List */}
        <div className="space-y-3">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => onSelect(game.id)}
              className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-xl text-left transition-all hover:scale-[1.02] border border-white/10 hover:border-white/30"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">
                  {game.id === 'board-game' && '🎲'}
                  {game.id === 'caption-contest' && '📸'}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">{game.name}</h3>
                  <p className="text-purple-200 text-sm">{game.description}</p>
                  <p className="text-purple-300 text-xs mt-1">
                    {game.minPlayers}-{game.maxPlayers} players
                  </p>
                </div>
                <div className="text-purple-300">
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
          className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 text-purple-200 rounded-xl transition font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
