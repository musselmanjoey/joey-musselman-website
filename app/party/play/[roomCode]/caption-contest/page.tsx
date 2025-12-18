'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '../../../components/SocketProvider';
import { ConnectionStatus } from '../../../components/ConnectionStatus';

interface Submission {
  caption: string;
  playerId: string;
}

interface GameState {
  state: 'submitting' | 'voting' | 'results';
  round: number;
  currentImage: string;
  hasSubmitted: boolean;
  hasVoted: boolean;
  submissions: Submission[];
  myScore: number;
}

export default function CaptionContestControllerPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const { socket, isConnected } = useSocket();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('request-state', { roomCode });

    function onStateUpdate({ gameState: state }: { gameState: GameState }) {
      if (state) setGameState(state);
    }

    function onGameStateChanged(data: {
      gameState: string;
      currentImage?: string;
      round?: number;
      submissions?: Submission[];
    }) {
      if (data.gameState === 'submitting') {
        setGameState(prev => ({
          state: 'submitting',
          round: data.round || (prev?.round || 0) + 1,
          currentImage: data.currentImage || '',
          hasSubmitted: false,
          hasVoted: false,
          submissions: [],
          myScore: prev?.myScore || 0,
        }));
        setCaption('');
        setIsSubmitting(false);
      } else if (data.gameState === 'voting' && data.submissions) {
        setGameState(prev => prev ? {
          ...prev,
          state: 'voting',
          submissions: data.submissions || [],
          hasVoted: false,
        } : null);
      } else if (data.gameState === 'results') {
        setGameState(prev => prev ? {
          ...prev,
          state: 'results',
        } : null);
      }
    }

    socket.on('state-update', onStateUpdate);
    socket.on('cc:game-state-changed', onGameStateChanged);

    return () => {
      socket.off('state-update', onStateUpdate);
      socket.off('cc:game-state-changed', onGameStateChanged);
    };
  }, [socket, isConnected, roomCode]);

  function handleSubmitCaption(e: React.FormEvent) {
    e.preventDefault();
    if (!socket || !caption.trim() || gameState?.hasSubmitted) return;

    setIsSubmitting(true);
    socket.emit('cc:submit-caption', { roomCode, caption: caption.trim() });
    setGameState(prev => prev ? { ...prev, hasSubmitted: true } : null);
  }

  function handleVote(playerId: string) {
    if (!socket || gameState?.hasVoted) return;

    socket.emit('cc:vote-caption', { roomCode, votedForId: playerId });
    setGameState(prev => prev ? { ...prev, hasVoted: true } : null);
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
        <p className="text-gray-500 text-sm">Round {gameState.round}</p>
        <p className="text-gray-400">Score: {gameState.myScore}</p>
      </div>

      {/* Submitting Phase */}
      {gameState.state === 'submitting' && (
        <div className="flex-1 flex flex-col">
          {/* Image Preview */}
          {gameState.currentImage && (
            <div className="flex-1 flex items-center justify-center mb-4">
              <img
                src={gameState.currentImage}
                alt="Caption this!"
                className="max-h-64 max-w-full object-contain rounded-lg"
              />
            </div>
          )}

          {!gameState.hasSubmitted ? (
            <form onSubmit={handleSubmitCaption} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Your Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write something funny..."
                  maxLength={200}
                  rows={3}
                  className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl px-4 py-3
                           focus:border-accent focus:outline-none transition-colors resize-none"
                />
                <p className="text-right text-gray-500 text-xs mt-1">{caption.length}/200</p>
              </div>
              <button
                type="submit"
                disabled={!caption.trim() || isSubmitting}
                className="w-full bg-accent hover:bg-accent-hover text-white font-semibold
                         py-4 rounded-xl text-lg transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Caption'}
              </button>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-xl font-bold mb-2">Caption Submitted!</h2>
              <p className="text-gray-400">Waiting for others...</p>
            </div>
          )}
        </div>
      )}

      {/* Voting Phase */}
      {gameState.state === 'voting' && (
        <div className="flex-1">
          {!gameState.hasVoted ? (
            <>
              <h2 className="text-xl font-bold text-center mb-4">Vote for the Best!</h2>
              <div className="space-y-3">
                {gameState.submissions.map((sub, i) => (
                  <button
                    key={i}
                    onClick={() => handleVote(sub.playerId)}
                    className="w-full bg-gray-700 hover:bg-gray-600 active:bg-accent
                             text-left p-4 rounded-xl transition-colors"
                  >
                    <p className="text-lg">&quot;{sub.caption}&quot;</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🗳️</div>
              <h2 className="text-xl font-bold mb-2">Vote Cast!</h2>
              <p className="text-gray-400">Waiting for results...</p>
            </div>
          )}
        </div>
      )}

      {/* Results Phase */}
      {gameState.state === 'results' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold mb-2">Round Complete!</h2>
          <p className="text-gray-400">Check the TV for results</p>
          <p className="text-gray-500 text-sm mt-4">Waiting for next round...</p>
        </div>
      )}
    </div>
  );
}
