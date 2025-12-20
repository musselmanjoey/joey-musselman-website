'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '../../../components/SocketProvider';
import { ConnectionStatus } from '../../../components/ConnectionStatus';

interface PlayerState {
  state: 'rolling' | 'moving' | 'trivia' | 'results' | 'gameover';
  round: number;
  myPosition: number;
  myColor: string;
  hasRolled: boolean;
  myRoll?: number;
  myMovement?: {
    roll: number;
    startPosition: number;
    finalPosition: number;
    trigger?: { type: string; name: string };
  };
  trivia?: {
    question: string;
    options: { id: string; text: string }[];
  };
  hasAnswered: boolean;
  standings: { playerName: string; position: number; color: string }[];
}

interface TurnSummary {
  roll: number;
  startPosition: number;
  endPosition: number;
  finalPosition: number;
  trigger?: { type: string; name: string; from: number; to: number };
  triviaCorrect?: boolean;
  triviaBonus?: number;
}

export default function BoardGameControllerPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const { socket, isConnected } = useSocket();

  const [gameState, setGameState] = useState<PlayerState | null>(null);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; bonus?: number } | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [turnSummary, setTurnSummary] = useState<TurnSummary | null>(null);
  const [triviaTimeLeft, setTriviaTimeLeft] = useState<number>(0);
  const [allRolledCountdown, setAllRolledCountdown] = useState<number>(0);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('request-state', { roomCode });

    function onStateUpdate({ gameState: state }: { gameState: PlayerState }) {
      if (state) setGameState(state);
    }

    function onRoundStarted() {
      setLastRoll(null);
      setAnswerResult(null);
      setTurnSummary(null);
      setGameState(prev => prev ? {
        ...prev,
        state: 'rolling',
        hasRolled: false,
        hasAnswered: false,
        trivia: undefined,
      } : null);
    }

    function onYourRoll({ roll }: { roll: number }) {
      setLastRoll(roll);
      setIsRolling(false);
      setGameState(prev => prev ? { ...prev, hasRolled: true, myRoll: roll } : null);
    }

    function onAllRolled(data: { countdown: number }) {
      setAllRolledCountdown(data.countdown);
    }

    function onMovements() {
      setAllRolledCountdown(0);
      setGameState(prev => prev ? { ...prev, state: 'moving' } : null);
    }

    function onYourMovement(data: {
      roll: number;
      startPosition: number;
      endPosition: number;
      finalPosition: number;
      trigger?: { type: string; name: string; from: number; to: number }
    }) {
      // Update position and store turn summary
      setGameState(prev => prev ? { ...prev, myPosition: data.finalPosition } : null);
      setTurnSummary({
        roll: data.roll,
        startPosition: data.startPosition,
        endPosition: data.endPosition,
        finalPosition: data.finalPosition,
        trigger: data.trigger,
      });
    }

    function onTriviaQuestion(data: { question: string; options: { id: string; text: string }[]; timeLimit: number }) {
      setGameState(prev => prev ? {
        ...prev,
        state: 'trivia',
        trivia: data,
        hasAnswered: false,
      } : null);
      setAnswerResult(null);
      setTriviaTimeLeft(data.timeLimit || 15);
    }

    function onAnswerResult(data: { correct: boolean; bonusMovement?: number; newPosition?: number }) {
      setAnswerResult({ correct: data.correct, bonus: data.bonusMovement });
      setGameState(prev => prev ? {
        ...prev,
        hasAnswered: true,
        myPosition: data.newPosition ?? prev.myPosition,
      } : null);
      // Update turn summary with trivia result
      setTurnSummary(prev => prev ? {
        ...prev,
        triviaCorrect: data.correct,
        triviaBonus: data.bonusMovement,
        finalPosition: data.newPosition ?? prev.finalPosition,
      } : null);
    }

    function onRoundResults(data: { positions: { playerId: string; position: number }[] }) {
      setGameState(prev => prev ? { ...prev, state: 'results' } : null);
    }

    function onGameOver() {
      setGameState(prev => prev ? { ...prev, state: 'gameover' } : null);
    }

    socket.on('state-update', onStateUpdate);
    socket.on('bg:round-started', onRoundStarted);
    socket.on('bg:your-roll', onYourRoll);
    socket.on('bg:all-rolled', onAllRolled);
    socket.on('bg:movements', onMovements);
    socket.on('bg:your-movement', onYourMovement);
    socket.on('bg:trivia-question', onTriviaQuestion);
    socket.on('bg:answer-result', onAnswerResult);
    socket.on('bg:round-results', onRoundResults);
    socket.on('bg:game-over', onGameOver);

    return () => {
      socket.off('state-update', onStateUpdate);
      socket.off('bg:round-started', onRoundStarted);
      socket.off('bg:your-roll', onYourRoll);
      socket.off('bg:all-rolled', onAllRolled);
      socket.off('bg:movements', onMovements);
      socket.off('bg:your-movement', onYourMovement);
      socket.off('bg:trivia-question', onTriviaQuestion);
      socket.off('bg:answer-result', onAnswerResult);
      socket.off('bg:round-results', onRoundResults);
      socket.off('bg:game-over', onGameOver);
    };
  }, [socket, isConnected, roomCode]);

  // Countdown timer for trivia
  useEffect(() => {
    if (gameState?.state !== 'trivia' || gameState?.hasAnswered || triviaTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setTriviaTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState?.state, gameState?.hasAnswered, triviaTimeLeft]);

  // Countdown for all-rolled delay
  useEffect(() => {
    if (allRolledCountdown <= 0) return;

    const timer = setInterval(() => {
      setAllRolledCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [allRolledCountdown]);

  function handleRoll() {
    if (!socket || gameState?.hasRolled) return;
    setIsRolling(true);
    socket.emit('bg:roll-dice', { roomCode });
  }

  function handleAnswer(answerId: string) {
    if (!socket || gameState?.hasAnswered) return;
    socket.emit('bg:submit-answer', { roomCode, answerId });
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xl text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-6 bg-white">
      <ConnectionStatus />

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-gray-50 border border-[var(--border)] px-4 py-2 rounded-lg">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: gameState.myColor }}
          />
          <span className="font-mono text-[var(--foreground)]">Space {gameState.myPosition}</span>
        </div>
        <p className="text-[var(--muted)] text-sm mt-2">Round {gameState.round}</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Rolling Phase */}
        {gameState.state === 'rolling' && (
          <div className="text-center">
            {!gameState.hasRolled ? (
              <button
                onClick={handleRoll}
                disabled={isRolling}
                className={`
                  w-48 h-48 rounded-full text-4xl font-bold
                  bg-gradient-to-br from-accent to-red-700
                  hover:from-red-500 hover:to-red-800
                  active:scale-95 transition-all
                  flex items-center justify-center
                  ${isRolling ? 'animate-bounce' : ''}
                `}
              >
                {isRolling ? '🎲' : 'ROLL!'}
              </button>
            ) : (
              <div className="text-center">
                <div className="text-8xl font-bold mb-4 text-[var(--foreground)]">{lastRoll}</div>
                <p className="text-xl text-[var(--foreground)] mb-2">You rolled a {lastRoll}!</p>
                {allRolledCountdown > 0 ? (
                  <p className="text-lg text-green-600">All rolled! Moving in {allRolledCountdown}...</p>
                ) : (
                  <p className="text-[var(--muted)] text-sm">Waiting for others...</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Moving Phase */}
        {gameState.state === 'moving' && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold mb-2 text-[var(--foreground)]">Moving!</h2>
            <p className="text-[var(--muted)]">Watch the TV screen</p>
            {gameState.myMovement?.trigger && (
              <div className="mt-4 bg-green-50 border border-green-500 px-4 py-2 rounded-lg text-green-700">
                {gameState.myMovement.trigger.type === 'ladder' ? '🪜' : '🎿'}
                {gameState.myMovement.trigger.name}!
              </div>
            )}
          </div>
        )}

        {/* Trivia Phase */}
        {gameState.state === 'trivia' && gameState.trivia && (
          <div className="w-full max-w-md">
            {!gameState.hasAnswered ? (
              <>
                {/* Timer bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--muted)]">Time remaining</span>
                    <span className={`font-bold ${triviaTimeLeft <= 5 ? 'text-red-600' : 'text-[var(--foreground)]'}`}>
                      {triviaTimeLeft}s
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        triviaTimeLeft <= 5 ? 'bg-red-500' : 'bg-accent'
                      }`}
                      style={{ width: `${(triviaTimeLeft / 15) * 100}%` }}
                    />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-center mb-6 text-[var(--foreground)]">
                  {gameState.trivia.question}
                </h2>
                <div className="space-y-3">
                  {gameState.trivia.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswer(opt.id)}
                      className="w-full bg-gray-50 border border-[var(--border)] hover:border-accent active:bg-red-50
                                 text-left px-4 py-4 rounded-xl transition-colors text-[var(--foreground)]"
                    >
                      <span className="font-bold mr-3 text-accent">{opt.id.toUpperCase()}.</span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center">
                {answerResult?.correct ? (
                  <>
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-green-600 mb-2">Correct!</h2>
                    <p className="text-green-600">+{answerResult.bonus} spaces bonus!</p>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold text-[var(--muted)] mb-2">Not quite!</h2>
                    <p className="text-[var(--muted)]">Better luck next time</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Results Phase */}
        {gameState.state === 'results' && (
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold mb-2 text-[var(--foreground)]">Round Complete!</h2>
            <p className="text-[var(--muted)]">You're on space {gameState.myPosition}</p>
            <p className="text-[var(--muted)] text-sm mt-2">Waiting for next round...</p>
          </div>
        )}

        {/* Game Over */}
        {gameState.state === 'gameover' && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2 text-[var(--foreground)]">Game Over!</h2>
            <p className="text-[var(--muted)]">Check the TV for results</p>
          </div>
        )}
      </div>

      {/* Turn Summary */}
      {turnSummary && (
        <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-[var(--border)]">
          <h3 className="text-sm text-[var(--muted)] mb-2">This Turn</h3>
          <div className="flex flex-wrap gap-2">
            {/* Roll */}
            <div className="bg-blue-50 border border-blue-300 px-3 py-1 rounded-full text-sm text-blue-700">
              🎲 Rolled {turnSummary.roll}
            </div>
            {/* Movement */}
            <div className="bg-gray-100 px-3 py-1 rounded-full text-sm text-[var(--foreground)]">
              {turnSummary.startPosition} → {turnSummary.endPosition}
            </div>
            {/* Ladder/Chute trigger */}
            {turnSummary.trigger && (
              <div className={`px-3 py-1 rounded-full text-sm ${
                turnSummary.trigger.type === 'ladder'
                  ? 'bg-green-50 border border-green-300 text-green-700'
                  : 'bg-red-50 border border-red-300 text-red-700'
              }`}>
                {turnSummary.trigger.type === 'ladder' ? '🪜' : '🎢'} {turnSummary.trigger.name}
                <span className="text-xs ml-1 opacity-70">
                  ({turnSummary.endPosition} → {turnSummary.finalPosition})
                </span>
              </div>
            )}
            {/* Trivia result */}
            {turnSummary.triviaCorrect !== undefined && (
              <div className={`px-3 py-1 rounded-full text-sm ${
                turnSummary.triviaCorrect
                  ? 'bg-green-50 border border-green-300 text-green-700'
                  : 'bg-gray-100 text-[var(--muted)]'
              }`}>
                {turnSummary.triviaCorrect ? `✅ +${turnSummary.triviaBonus}` : '❌ Trivia'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer: Position */}
      <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-[var(--border)]">
        <div className="flex justify-between items-center">
          <span className="text-[var(--muted)]">Your Position</span>
          <span className="text-2xl font-bold text-[var(--foreground)]">{gameState.myPosition} / 50</span>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${(gameState.myPosition / 50) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
