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

export default function BoardGameControllerPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const { socket, isConnected } = useSocket();

  const [gameState, setGameState] = useState<PlayerState | null>(null);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; bonus?: number } | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('request-state', { roomCode });

    function onStateUpdate({ gameState: state }: { gameState: PlayerState }) {
      if (state) setGameState(state);
    }

    function onRoundStarted() {
      setLastRoll(null);
      setAnswerResult(null);
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

    function onMovements() {
      setGameState(prev => prev ? { ...prev, state: 'moving' } : null);
    }

    function onTriviaQuestion(data: { question: string; options: { id: string; text: string }[] }) {
      setGameState(prev => prev ? {
        ...prev,
        state: 'trivia',
        trivia: data,
        hasAnswered: false,
      } : null);
      setAnswerResult(null);
    }

    function onAnswerResult(data: { correct: boolean; bonusMovement?: number; newPosition?: number }) {
      setAnswerResult({ correct: data.correct, bonus: data.bonusMovement });
      setGameState(prev => prev ? {
        ...prev,
        hasAnswered: true,
        myPosition: data.newPosition ?? prev.myPosition,
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
    socket.on('bg:movements', onMovements);
    socket.on('bg:trivia-question', onTriviaQuestion);
    socket.on('bg:answer-result', onAnswerResult);
    socket.on('bg:round-results', onRoundResults);
    socket.on('bg:game-over', onGameOver);

    return () => {
      socket.off('state-update', onStateUpdate);
      socket.off('bg:round-started', onRoundStarted);
      socket.off('bg:your-roll', onYourRoll);
      socket.off('bg:movements', onMovements);
      socket.off('bg:trivia-question', onTriviaQuestion);
      socket.off('bg:answer-result', onAnswerResult);
      socket.off('bg:round-results', onRoundResults);
      socket.off('bg:game-over', onGameOver);
    };
  }, [socket, isConnected, roomCode]);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-6">
      <ConnectionStatus />

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: gameState.myColor }}
          />
          <span className="font-mono">Space {gameState.myPosition}</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">Round {gameState.round}</p>
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
                <div className="text-8xl font-bold mb-4">{lastRoll}</div>
                <p className="text-gray-400">You rolled a {lastRoll}!</p>
                <p className="text-gray-500 text-sm mt-2">Waiting for others...</p>
              </div>
            )}
          </div>
        )}

        {/* Moving Phase */}
        {gameState.state === 'moving' && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold mb-2">Moving!</h2>
            <p className="text-gray-400">Watch the TV screen</p>
            {gameState.myMovement?.trigger && (
              <div className="mt-4 bg-green-500/20 border border-green-500 px-4 py-2 rounded-lg">
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
                <h2 className="text-xl font-bold text-center mb-6">
                  {gameState.trivia.question}
                </h2>
                <div className="space-y-3">
                  {gameState.trivia.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswer(opt.id)}
                      className="w-full bg-gray-700 hover:bg-gray-600 active:bg-accent
                                 text-left px-4 py-4 rounded-xl transition-colors"
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
                    <h2 className="text-2xl font-bold text-green-400 mb-2">Correct!</h2>
                    <p className="text-green-400">+{answerResult.bonus} spaces bonus!</p>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold text-gray-400 mb-2">Not quite!</h2>
                    <p className="text-gray-500">Better luck next time</p>
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
            <h2 className="text-2xl font-bold mb-2">Round Complete!</h2>
            <p className="text-gray-400">You're on space {gameState.myPosition}</p>
            <p className="text-gray-500 text-sm mt-2">Waiting for next round...</p>
          </div>
        )}

        {/* Game Over */}
        {gameState.state === 'gameover' && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2">Game Over!</h2>
            <p className="text-gray-400">Check the TV for results</p>
          </div>
        )}
      </div>

      {/* Footer: Position */}
      <div className="mt-6 bg-gray-800/50 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Your Position</span>
          <span className="text-2xl font-bold">{gameState.myPosition} / 50</span>
        </div>
        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${(gameState.myPosition / 50) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
