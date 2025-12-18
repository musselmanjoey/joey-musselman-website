'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '../../../components/SocketProvider';
import { RoomCodeDisplay } from '../../../components/RoomCodeDisplay';
import { ConnectionStatus } from '../../../components/ConnectionStatus';

interface PlayerPosition {
  playerId: string;
  playerName: string;
  position: number;
  color: string;
}

interface Movement {
  playerId: string;
  playerName: string;
  color: string;
  roll: number;
  startPosition: number;
  endPosition: number;
  finalPosition: number;
  trigger?: {
    type: 'ladder' | 'chute';
    name: string;
    from: number;
    to: number;
  };
}

interface TriviaState {
  question: string;
  options: { id: string; text: string }[];
  answeredCount: number;
  totalPlayers: number;
}

interface GameState {
  state: 'rolling' | 'moving' | 'trivia' | 'results' | 'gameover';
  round: number;
  board: {
    totalSpaces: number;
    winSpace: number;
    ladders: { start: number; end: number; name: string }[];
    chutes: { start: number; end: number; name: string }[];
  };
  positions: PlayerPosition[];
  rolls?: { playerId: string; playerName: string; hasRolled: boolean; roll?: number }[];
  movements?: Movement[];
  trivia?: TriviaState;
  standings: PlayerPosition[];
}

export default function BoardGameTVPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const { socket, isConnected } = useSocket();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastResults, setLastResults] = useState<{
    triviaResults?: { playerName: string; correct: boolean }[];
    correctAnswer?: { text: string };
  } | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('request-state', { roomCode });

    function onStateUpdate({ gameState: state }: { gameState: GameState }) {
      if (state) setGameState(state);
    }

    function onRoundStarted(data: { round: number; positions: PlayerPosition[] }) {
      setGameState(prev => prev ? {
        ...prev,
        state: 'rolling',
        round: data.round,
        positions: data.positions,
        rolls: undefined,
        movements: undefined,
        trivia: undefined,
      } : null);
      setLastResults(null);
    }

    function onPlayerRolled(data: { playerId: string; playerName: string; roll: number; rollsRemaining: number }) {
      setGameState(prev => {
        if (!prev) return null;
        const rolls = prev.rolls || prev.positions.map(p => ({
          playerId: p.playerId,
          playerName: p.playerName,
          hasRolled: false,
        }));
        return {
          ...prev,
          rolls: rolls.map(r =>
            r.playerId === data.playerId
              ? { ...r, hasRolled: true, roll: data.roll }
              : r
          ),
        };
      });
    }

    function onMovements(data: { movements: Movement[]; positions: PlayerPosition[] }) {
      setGameState(prev => prev ? {
        ...prev,
        state: 'moving',
        movements: data.movements,
        positions: data.positions,
      } : null);
    }

    function onTriviaQuestion(data: { question: string; options: { id: string; text: string }[]; timeLimit: number }) {
      setGameState(prev => prev ? {
        ...prev,
        state: 'trivia',
        trivia: {
          question: data.question,
          options: data.options,
          answeredCount: 0,
          totalPlayers: prev.positions.length,
        },
      } : null);
    }

    function onAnswerReceived(data: { answeredCount: number }) {
      setGameState(prev => {
        if (!prev || !prev.trivia) return prev;
        return {
          ...prev,
          trivia: { ...prev.trivia, answeredCount: data.answeredCount },
        };
      });
    }

    function onRoundResults(data: {
      positions: PlayerPosition[];
      standings: PlayerPosition[];
      triviaResults: { playerName: string; correct: boolean }[];
      correctAnswer: { text: string };
    }) {
      setGameState(prev => prev ? {
        ...prev,
        state: 'results',
        positions: data.positions,
        standings: data.standings,
      } : null);
      setLastResults({
        triviaResults: data.triviaResults,
        correctAnswer: data.correctAnswer,
      });
    }

    function onGameOver(data: { winner: { name: string; color: string }; finalStandings: PlayerPosition[] }) {
      setGameState(prev => prev ? {
        ...prev,
        state: 'gameover',
        standings: data.finalStandings,
      } : null);
    }

    socket.on('state-update', onStateUpdate);
    socket.on('bg:round-started', onRoundStarted);
    socket.on('bg:player-rolled', onPlayerRolled);
    socket.on('bg:movements', onMovements);
    socket.on('bg:trivia-question', onTriviaQuestion);
    socket.on('bg:answer-received', onAnswerReceived);
    socket.on('bg:round-results', onRoundResults);
    socket.on('bg:game-over', onGameOver);

    return () => {
      socket.off('state-update', onStateUpdate);
      socket.off('bg:round-started', onRoundStarted);
      socket.off('bg:player-rolled', onPlayerRolled);
      socket.off('bg:movements', onMovements);
      socket.off('bg:trivia-question', onTriviaQuestion);
      socket.off('bg:answer-received', onAnswerReceived);
      socket.off('bg:round-results', onRoundResults);
      socket.off('bg:game-over', onGameOver);
    };
  }, [socket, isConnected, roomCode]);

  function handleNextRound() {
    socket?.emit('bg:next-round', { roomCode });
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-400">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <ConnectionStatus />

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Board Rush</h1>
          <p className="text-gray-400">Round {gameState.round}</p>
        </div>
        <RoomCodeDisplay code={roomCode} size="small" />
      </div>

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-140px)]">
        {/* Left: Game Board */}
        <div className="col-span-2 bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
          <BoardDisplay
            positions={gameState.positions}
            board={gameState.board}
            movements={gameState.movements}
          />
        </div>

        {/* Right: Status Panel */}
        <div className="space-y-4">
          {/* Phase Indicator */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <PhaseDisplay
              state={gameState.state}
              rolls={gameState.rolls}
              trivia={gameState.trivia}
              lastResults={lastResults}
              onNextRound={handleNextRound}
            />
          </div>

          {/* Standings */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex-1">
            <h3 className="text-lg font-semibold mb-3">Standings</h3>
            <div className="space-y-2">
              {gameState.standings.map((player, index) => (
                <div
                  key={player.playerId}
                  className="flex items-center gap-3 px-3 py-2 bg-gray-700/50 rounded-lg"
                >
                  <span className="text-gray-500 w-6">{index + 1}.</span>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="flex-1">{player.playerName}</span>
                  <span className="text-gray-400">Space {player.position}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Board Display Component
function BoardDisplay({
  positions,
  board,
  movements,
}: {
  positions: PlayerPosition[];
  board: GameState['board'];
  movements?: Movement[];
}) {
  const spaces = Array.from({ length: board.totalSpaces }, (_, i) => i + 1);
  const cols = 10;

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-10 gap-1 flex-1">
        {spaces.map((space) => {
          const playersHere = positions.filter(p => p.position === space);
          const ladder = board.ladders.find(l => l.start === space);
          const chute = board.chutes.find(c => c.start === space);
          const isWinSpace = space === board.winSpace;

          return (
            <div
              key={space}
              className={`
                relative rounded-lg p-1 text-xs flex flex-col items-center justify-center
                ${isWinSpace ? 'bg-yellow-500/30 border-2 border-yellow-500' : 'bg-gray-700/50'}
                ${ladder ? 'bg-green-500/20 border border-green-500' : ''}
                ${chute ? 'bg-blue-500/20 border border-blue-500' : ''}
              `}
            >
              <span className="text-gray-500">{space}</span>

              {/* Ladder indicator */}
              {ladder && (
                <span className="text-green-400 text-[10px]">↑{ladder.end}</span>
              )}

              {/* Players on this space */}
              {playersHere.length > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {playersHere.map(p => (
                    <div
                      key={p.playerId}
                      className="w-3 h-3 rounded-full border border-white"
                      style={{ backgroundColor: p.color }}
                      title={p.playerName}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Movement animations / last moves */}
      {movements && movements.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {movements.map(m => (
            <div key={m.playerId} className="bg-gray-700 rounded-lg px-3 py-1 text-sm flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
              <span>{m.playerName}</span>
              <span className="text-gray-400">rolled {m.roll}</span>
              {m.trigger && (
                <span className={m.trigger.type === 'ladder' ? 'text-green-400' : 'text-blue-400'}>
                  {m.trigger.type === 'ladder' ? '🪜' : '🎿'} {m.trigger.name}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Phase Display Component
function PhaseDisplay({
  state,
  rolls,
  trivia,
  lastResults,
  onNextRound,
}: {
  state: string;
  rolls?: { playerName: string; hasRolled: boolean; roll?: number }[];
  trivia?: TriviaState;
  lastResults: { triviaResults?: { playerName: string; correct: boolean }[]; correctAnswer?: { text: string } } | null;
  onNextRound: () => void;
}) {
  if (state === 'rolling' && rolls) {
    const waiting = rolls.filter(r => !r.hasRolled);
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-yellow-400">Rolling Phase</h3>
        <p className="text-gray-400 mb-2">Waiting for players to roll:</p>
        <div className="space-y-1">
          {waiting.map(r => (
            <div key={r.playerName} className="text-gray-300">{r.playerName}</div>
          ))}
        </div>
        {rolls.filter(r => r.hasRolled).map(r => (
          <div key={r.playerName} className="text-green-400">
            {r.playerName} rolled {r.roll}
          </div>
        ))}
      </div>
    );
  }

  if (state === 'moving') {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-blue-400">Moving!</h3>
        <p className="text-gray-400">Watch the board...</p>
      </div>
    );
  }

  if (state === 'trivia' && trivia) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-purple-400">Trivia Time!</h3>
        <p className="text-xl mb-4">{trivia.question}</p>
        <div className="space-y-2 mb-4">
          {trivia.options.map(opt => (
            <div key={opt.id} className="bg-gray-700 px-3 py-2 rounded-lg">
              <span className="font-bold mr-2">{opt.id.toUpperCase()}.</span>
              {opt.text}
            </div>
          ))}
        </div>
        <p className="text-gray-400">
          {trivia.answeredCount}/{trivia.totalPlayers} answered
        </p>
      </div>
    );
  }

  if (state === 'results' && lastResults) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-green-400">Results</h3>
        {lastResults.correctAnswer && (
          <p className="mb-3">
            Answer: <span className="text-green-400">{lastResults.correctAnswer.text}</span>
          </p>
        )}
        {lastResults.triviaResults && (
          <div className="space-y-1 mb-4">
            {lastResults.triviaResults.map(r => (
              <div key={r.playerName} className={r.correct ? 'text-green-400' : 'text-gray-500'}>
                {r.correct ? '✓' : '✗'} {r.playerName}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onNextRound}
          className="w-full bg-accent hover:bg-accent-hover text-white py-3 rounded-xl font-semibold"
        >
          Next Round
        </button>
      </div>
    );
  }

  if (state === 'gameover') {
    return (
      <div className="text-center">
        <h3 className="text-3xl font-bold mb-3 text-yellow-400">Game Over!</h3>
        <p className="text-xl">🎉 Winner above! 🎉</p>
      </div>
    );
  }

  return <div className="text-gray-400">Loading...</div>;
}
