'use client';

interface Game {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

interface GameSelectorProps {
  games: Game[];
  selectedGame: string | null;
  onSelect: (gameId: string) => void;
  playerCount: number;
}

export function GameSelector({ games, selectedGame, onSelect, playerCount }: GameSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-[var(--foreground)]">Select a Game</h3>
      <div className="grid gap-3">
        {games.map((game) => {
          const isSelected = selectedGame === game.id;
          const hasEnoughPlayers = playerCount >= game.minPlayers;
          const tooManyPlayers = playerCount > game.maxPlayers;
          const canPlay = hasEnoughPlayers && !tooManyPlayers;

          return (
            <button
              key={game.id}
              onClick={() => onSelect(game.id)}
              className={`
                p-4 rounded-xl text-left transition-all border-2
                ${isSelected
                  ? 'bg-red-50 border-accent'
                  : 'bg-gray-50 border-[var(--border)] hover:border-accent/50'
                }
                ${!canPlay ? 'opacity-50' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-lg text-[var(--foreground)]">{game.name}</h4>
                  <p className="text-[var(--muted)] text-sm mt-1">{game.description}</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-[var(--muted)]">
                {game.minPlayers}-{game.maxPlayers} players
                {!hasEnoughPlayers && (
                  <span className="text-yellow-600 ml-2">
                    (need {game.minPlayers - playerCount} more)
                  </span>
                )}
                {tooManyPlayers && (
                  <span className="text-red-600 ml-2">
                    (too many players)
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
