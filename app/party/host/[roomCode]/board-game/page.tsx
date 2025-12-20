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
  const [triviaTimeLeft, setTriviaTimeLeft] = useState<number>(0);

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
      setTriviaTimeLeft(data.timeLimit || 15);
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

  // Countdown timer for trivia
  useEffect(() => {
    if (gameState?.state !== 'trivia' || triviaTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setTriviaTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState?.state, triviaTimeLeft]);

  function handleNextRound() {
    socket?.emit('bg:next-round', { roomCode });
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xl text-[var(--muted)]">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-white">
      <ConnectionStatus />

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Board Rush</h1>
          <p className="text-[var(--muted)]">Round {gameState.round}</p>
        </div>
        <RoomCodeDisplay code={roomCode} size="small" />
      </div>

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-140px)]">
        {/* Left: Game Board */}
        <div className="col-span-2 bg-gray-50 rounded-2xl p-6 border border-[var(--border)]">
          <BoardDisplay
            positions={gameState.positions}
            board={gameState.board}
            movements={gameState.movements}
          />
        </div>

        {/* Right: Status Panel */}
        <div className="space-y-4">
          {/* Phase Indicator */}
          <div className="bg-gray-50 rounded-xl p-4 border border-[var(--border)]">
            <PhaseDisplay
              state={gameState.state}
              rolls={gameState.rolls}
              trivia={gameState.trivia}
              triviaTimeLeft={triviaTimeLeft}
              lastResults={lastResults}
              onNextRound={handleNextRound}
            />
          </div>

          {/* Standings */}
          <div className="bg-gray-50 rounded-xl p-4 border border-[var(--border)] flex-1">
            <h3 className="text-lg font-semibold mb-3 text-[var(--foreground)]">Standings</h3>
            <div className="space-y-2">
              {gameState.standings.map((player, index) => (
                <div
                  key={player.playerId}
                  className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-[var(--border)]"
                >
                  <span className="text-[var(--muted)] w-6">{index + 1}.</span>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="flex-1 text-[var(--foreground)]">{player.playerName}</span>
                  <span className="text-[var(--muted)]">Space {player.position}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Row colors for Charlotte neighborhoods (placeholder names for now)
const ROW_THEMES = [
  { name: 'Row 1', color: 'bg-red-900/40', border: 'border-red-700' },
  { name: 'Row 2', color: 'bg-orange-900/40', border: 'border-orange-700' },
  { name: 'Row 3', color: 'bg-yellow-900/40', border: 'border-yellow-700' },
  { name: 'Row 4', color: 'bg-green-900/40', border: 'border-green-700' },
  { name: 'Row 5', color: 'bg-blue-900/40', border: 'border-blue-700' },
];

// Convert space number to grid position (snake pattern, bottom to top)
function getSpacePosition(space: number, cols: number = 10): { row: number; col: number } {
  const row = Math.floor((space - 1) / cols);
  const colInRow = (space - 1) % cols;
  // Snake pattern: even rows go left-to-right, odd rows go right-to-left
  const col = row % 2 === 0 ? colInRow : cols - 1 - colInRow;
  return { row, col };
}

// Get grid position for SVG drawing (in grid units, not percentages)
function getSpaceCenter(space: number, cols: number, totalRows: number): { x: number; y: number } {
  const { row, col } = getSpacePosition(space, cols);
  // Flip row for bottom-to-top display
  const flippedRow = totalRows - 1 - row;
  return {
    x: col + 0.5,  // Center of cell in grid units
    y: flippedRow + 0.5,
  };
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
  const cols = 10;
  const rows = Math.ceil(board.totalSpaces / cols);

  // Build the grid in snake pattern, bottom to top
  const gridRows: number[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowSpaces: number[] = [];
    for (let col = 0; col < cols; col++) {
      const spaceNum = row * cols + col + 1;
      if (spaceNum <= board.totalSpaces) {
        if (row % 2 === 0) {
          rowSpaces.push(spaceNum);
        } else {
          rowSpaces.unshift(spaceNum);
        }
      }
    }
    gridRows.push(rowSpaces);
  }
  gridRows.reverse();

  // Calculate ladder/chute line positions (in grid units)
  // Offset endpoints so they connect at tile edges, not centers
  const getLadderPoints = (startSpace: number, endSpace: number) => {
    const start = getSpaceCenter(startSpace, cols, rows);
    const end = getSpaceCenter(endSpace, cols, rows);

    // Offset to move from center towards edge of tile (0.35 = 70% towards edge)
    const edgeOffset = 0.35;

    // Determine which point is higher/lower on board (lower Y = higher on screen)
    if (start.y > end.y) {
      // start is lower on board (ladder going up, or chute end)
      // start connects at TOP of its tile (reduce Y)
      // end connects at BOTTOM of its tile (increase Y)
      return {
        x1: start.x,
        y1: start.y - edgeOffset,
        x2: end.x,
        y2: end.y + edgeOffset,
      };
    } else {
      // start is higher on board (chute going down)
      // start connects at BOTTOM of its tile (increase Y)
      // end connects at TOP of its tile (reduce Y)
      return {
        x1: start.x,
        y1: start.y + edgeOffset,
        x2: end.x,
        y2: end.y - edgeOffset,
      };
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Board Container */}
      <div className="relative flex-1 bg-amber-950/30 rounded-xl border-4 border-amber-800 overflow-hidden">
        <div className="h-full flex">
          {/* Row Labels Column */}
          <div className="w-20 flex flex-col">
            {gridRows.map((_, rowIndex) => {
              const theme = ROW_THEMES[rows - 1 - rowIndex] || ROW_THEMES[0];
              return (
                <div
                  key={rowIndex}
                  className={`flex-1 flex items-center justify-center ${theme.color} border-r ${theme.border}`}
                >
                  <span className="text-xs font-bold text-white/70 [writing-mode:vertical-lr] rotate-180">
                    {theme.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Game Board with SVG Overlay */}
          <div className="flex-1 relative">
            {/* SVG Layer for Ladders and Chutes */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-30"
              viewBox={`0 0 ${cols} ${rows}`}
              preserveAspectRatio="none"
            >
              {/* Ladders - drawn as proper ladder shapes */}
              {board.ladders.map((ladder, i) => {
                const pts = getLadderPoints(ladder.start, ladder.end);
                // Calculate perpendicular offset for rails
                const dx = pts.x2 - pts.x1;
                const dy = pts.y2 - pts.y1;
                const len = Math.sqrt(dx * dx + dy * dy);
                const perpX = (-dy / len) * 0.12;
                const perpY = (dx / len) * 0.12;

                return (
                  <g key={`ladder-${i}`} opacity="0.6">
                    {/* Ladder rails */}
                    <line
                      x1={pts.x1 + perpX} y1={pts.y1 + perpY}
                      x2={pts.x2 + perpX} y2={pts.y2 + perpY}
                      stroke="#15803d" strokeWidth="0.08"
                    />
                    <line
                      x1={pts.x1 - perpX} y1={pts.y1 - perpY}
                      x2={pts.x2 - perpX} y2={pts.y2 - perpY}
                      stroke="#15803d" strokeWidth="0.08"
                    />
                    {/* Rungs - perpendicular to ladder direction */}
                    {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map((t, j) => {
                      const rx = pts.x1 + dx * t;
                      const ry = pts.y1 + dy * t;
                      return (
                        <line
                          key={j}
                          x1={rx + perpX} y1={ry + perpY}
                          x2={rx - perpX} y2={ry - perpY}
                          stroke="#22c55e" strokeWidth="0.06"
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Chutes - curved slide tubes */}
              {board.chutes.map((chute, i) => {
                const pts = getLadderPoints(chute.start, chute.end);
                // Curve control point offset (to the right of the line)
                const dx = pts.x2 - pts.x1;
                const dy = pts.y2 - pts.y1;
                const curveAmount = 0.8;
                const midX = (pts.x1 + pts.x2) / 2 + curveAmount;
                const midY = (pts.y1 + pts.y2) / 2;

                return (
                  <g key={`chute-${i}`} opacity="0.6">
                    {/* Chute outer tube */}
                    <path
                      d={`M ${pts.x1} ${pts.y1} Q ${midX} ${midY} ${pts.x2} ${pts.y2}`}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="0.25"
                      strokeLinecap="round"
                    />
                    {/* Chute inner highlight */}
                    <path
                      d={`M ${pts.x1} ${pts.y1} Q ${midX} ${midY} ${pts.x2} ${pts.y2}`}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="0.12"
                      strokeLinecap="round"
                      strokeDasharray="0.15 0.15"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Grid of Spaces */}
            <div className="relative z-20 h-full flex flex-col">
              {gridRows.map((rowSpaces, rowIndex) => {
                const theme = ROW_THEMES[rows - 1 - rowIndex] || ROW_THEMES[0];
                return (
                  <div key={rowIndex} className={`flex-1 flex ${theme.color}`}>
                    {rowSpaces.map((space) => {
                      const playersHere = positions.filter(p => p.position === space);
                      const ladder = board.ladders.find(l => l.start === space);
                      const ladderEnd = board.ladders.find(l => l.end === space);
                      const chute = board.chutes.find(c => c.start === space);
                      const chuteEnd = board.chutes.find(c => c.end === space);
                      const isWinSpace = space === board.winSpace;
                      const isStartSpace = space === 1;
                      const spaceColorClass = (space % 2 === 0) ? 'bg-amber-100/10' : 'bg-amber-200/15';

                      return (
                        <div
                          key={space}
                          className={`
                            flex-1 border border-amber-900/50 flex flex-col items-center justify-center relative
                            ${spaceColorClass}
                            ${isWinSpace ? 'bg-yellow-500/40 border-2 border-yellow-400' : ''}
                            ${isStartSpace ? 'bg-green-500/30 border-2 border-green-400' : ''}
                            ${ladder ? 'bg-green-600/30' : ''}
                            ${ladderEnd ? 'bg-green-400/20' : ''}
                            ${chute ? 'bg-red-600/30' : ''}
                            ${chuteEnd ? 'bg-red-400/20' : ''}
                          `}
                        >
                          <span className={`text-lg font-bold ${isWinSpace ? 'text-yellow-300' : 'text-amber-300/90'}`}>
                            {space}
                          </span>

                          {ladder && <span className="text-[9px] text-green-300 font-bold">🪜 ↑{ladder.end}</span>}
                          {chute && <span className="text-[9px] text-red-300 font-bold">🎢 ↓{chute.end}</span>}
                          {isWinSpace && <span className="text-[9px] text-yellow-300 font-bold">🏆 WIN</span>}
                          {isStartSpace && <span className="text-[9px] text-green-300 font-bold">▶ START</span>}

                          {playersHere.length > 0 && (
                            <div className="absolute bottom-0.5 flex gap-0.5">
                              {playersHere.map(p => (
                                <div
                                  key={p.playerId}
                                  className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
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
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Movement Log */}
      {movements && movements.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {movements.map(m => (
            <div key={m.playerId} className="bg-white border border-[var(--border)] rounded-lg px-3 py-1 text-sm flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
              <span className="text-[var(--foreground)]">{m.playerName}</span>
              <span className="text-[var(--muted)]">rolled {m.roll}</span>
              {m.trigger && (
                <span className={m.trigger.type === 'ladder' ? 'text-green-600' : 'text-red-600'}>
                  {m.trigger.type === 'ladder' ? '🪜' : '🎢'} {m.trigger.name}
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
  triviaTimeLeft,
  lastResults,
  onNextRound,
}: {
  state: string;
  rolls?: { playerName: string; hasRolled: boolean; roll?: number }[];
  trivia?: TriviaState;
  triviaTimeLeft: number;
  lastResults: { triviaResults?: { playerName: string; correct: boolean }[]; correctAnswer?: { text: string } } | null;
  onNextRound: () => void;
}) {
  if (state === 'rolling' && rolls) {
    const waiting = rolls.filter(r => !r.hasRolled);
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-yellow-600">Rolling Phase</h3>
        <p className="text-[var(--muted)] mb-2">Waiting for players to roll:</p>
        <div className="space-y-1">
          {waiting.map(r => (
            <div key={r.playerName} className="text-[var(--foreground)]">{r.playerName}</div>
          ))}
        </div>
        {rolls.filter(r => r.hasRolled).map(r => (
          <div key={r.playerName} className="text-green-600">
            {r.playerName} rolled {r.roll}
          </div>
        ))}
      </div>
    );
  }

  if (state === 'moving') {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-blue-600">Moving!</h3>
        <p className="text-[var(--muted)]">Watch the board...</p>
      </div>
    );
  }

  if (state === 'trivia' && trivia) {
    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-accent">Trivia Time!</h3>
          <span className={`text-2xl font-bold ${triviaTimeLeft <= 5 ? 'text-red-600' : 'text-[var(--foreground)]'}`}>
            {triviaTimeLeft}s
          </span>
        </div>
        {/* Timer bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              triviaTimeLeft <= 5 ? 'bg-red-500' : 'bg-accent'
            }`}
            style={{ width: `${(triviaTimeLeft / 15) * 100}%` }}
          />
        </div>
        <p className="text-xl mb-4 text-[var(--foreground)]">{trivia.question}</p>
        <div className="space-y-2 mb-4">
          {trivia.options.map(opt => (
            <div key={opt.id} className="bg-white border border-[var(--border)] px-3 py-2 rounded-lg text-[var(--foreground)]">
              <span className="font-bold mr-2 text-accent">{opt.id.toUpperCase()}.</span>
              {opt.text}
            </div>
          ))}
        </div>
        <p className="text-[var(--muted)]">
          {trivia.answeredCount}/{trivia.totalPlayers} answered
        </p>
      </div>
    );
  }

  if (state === 'results' && lastResults) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-3 text-green-600">Results</h3>
        {lastResults.correctAnswer && (
          <p className="mb-3 text-[var(--foreground)]">
            Answer: <span className="text-green-600">{lastResults.correctAnswer.text}</span>
          </p>
        )}
        {lastResults.triviaResults && (
          <div className="space-y-1 mb-4">
            {lastResults.triviaResults.map(r => (
              <div key={r.playerName} className={r.correct ? 'text-green-600' : 'text-[var(--muted)]'}>
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
        <h3 className="text-3xl font-bold mb-3 text-yellow-600">Game Over!</h3>
        <p className="text-xl text-[var(--foreground)]">🎉 Winner above! 🎉</p>
      </div>
    );
  }

  return <div className="text-[var(--muted)]">Loading...</div>;
}
