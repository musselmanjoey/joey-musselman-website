'use client';

interface Player {
  id: string;
  name: string;
  isHost?: boolean;
}

interface PlayerListProps {
  players: Player[];
  title?: string;
  showCount?: boolean;
  maxPlayers?: number;
}

export function PlayerList({ players, title = 'Players', showCount = true, maxPlayers }: PlayerListProps) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
        {showCount && (
          <span className="text-sm text-gray-400">
            {players.length}{maxPlayers ? `/${maxPlayers}` : ''}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {players.length === 0 ? (
          <p className="text-gray-500 text-sm italic">Waiting for players...</p>
        ) : (
          players.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg"
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-white">{player.name}</span>
              {player.isHost && (
                <span className="ml-auto text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                  HOST
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
