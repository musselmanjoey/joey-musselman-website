'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '../../../components/SocketProvider';
import { RoomCodeDisplay } from '../../../components/RoomCodeDisplay';
import { ConnectionStatus } from '../../../components/ConnectionStatus';

interface Score {
  name: string;
  score: number;
}

interface VoteCount {
  playerName: string;
  caption: string;
  votes: number;
}

interface GameState {
  state: 'submitting' | 'voting' | 'results';
  round: number;
  currentImage: string;
  submissionCount: number;
  voteCount: number;
  playerCount: number;
  scores: Score[];
  submissions?: { caption: string; playerId: string }[];
}

interface ResultsData {
  winner?: { name: string };
  winningCaption?: string;
  allScores: Score[];
  voteCounts: VoteCount[];
}

export default function CaptionContestTVPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const { socket, isConnected } = useSocket();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [results, setResults] = useState<ResultsData | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('request-state', { roomCode });

    function onStateUpdate({ gameState: state }: { gameState: GameState }) {
      if (state) setGameState(state);
    }

    function onSubmissionReceived(data: { totalSubmissions: number; totalPlayers: number }) {
      setGameState(prev => prev ? {
        ...prev,
        submissionCount: data.totalSubmissions,
        playerCount: data.totalPlayers,
      } : null);
    }

    function onVoteRecorded(data: { votesReceived: number; totalPlayers: number }) {
      setGameState(prev => prev ? {
        ...prev,
        voteCount: data.votesReceived,
        playerCount: data.totalPlayers,
      } : null);
    }

    function onGameStateChanged(data: {
      gameState: string;
      currentImage?: string;
      round?: number;
      submissions?: { caption: string; playerId: string }[];
      winner?: { name: string };
      winningCaption?: string;
      allScores?: Score[];
      voteCounts?: VoteCount[];
    }) {
      if (data.gameState === 'submitting') {
        setGameState(prev => ({
          state: 'submitting',
          round: data.round || 1,
          currentImage: data.currentImage || '',
          submissionCount: 0,
          voteCount: 0,
          playerCount: prev?.playerCount || 0,
          scores: prev?.scores || [],
        }));
        setResults(null);
      } else if (data.gameState === 'voting') {
        setGameState(prev => prev ? {
          ...prev,
          state: 'voting',
          submissions: data.submissions,
          voteCount: 0,
        } : null);
      } else if (data.gameState === 'results') {
        setGameState(prev => prev ? {
          ...prev,
          state: 'results',
          scores: data.allScores || [],
        } : null);
        setResults({
          winner: data.winner,
          winningCaption: data.winningCaption,
          allScores: data.allScores || [],
          voteCounts: data.voteCounts || [],
        });
      }
    }

    socket.on('state-update', onStateUpdate);
    socket.on('cc:submission-received', onSubmissionReceived);
    socket.on('cc:vote-recorded', onVoteRecorded);
    socket.on('cc:game-state-changed', onGameStateChanged);

    return () => {
      socket.off('state-update', onStateUpdate);
      socket.off('cc:submission-received', onSubmissionReceived);
      socket.off('cc:vote-recorded', onVoteRecorded);
      socket.off('cc:game-state-changed', onGameStateChanged);
    };
  }, [socket, isConnected, roomCode]);

  function handleNextRound() {
    socket?.emit('cc:next-round', { roomCode });
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
          <h1 className="text-3xl font-bold">Caption Contest</h1>
          <p className="text-gray-400">Round {gameState.round}</p>
        </div>
        <RoomCodeDisplay code={roomCode} size="small" />
      </div>

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-140px)]">
        {/* Left: Main Content */}
        <div className="col-span-2 bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden flex flex-col">
          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4">
            {gameState.currentImage && (
              <img
                src={gameState.currentImage}
                alt="Caption this!"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            )}
          </div>

          {/* Phase Content */}
          <div className="p-6 bg-gray-900/50">
            {gameState.state === 'submitting' && (
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Submit Your Captions!</h2>
                <p className="text-gray-400">
                  {gameState.submissionCount} / {gameState.playerCount} submitted
                </p>
              </div>
            )}

            {gameState.state === 'voting' && gameState.submissions && (
              <div>
                <h2 className="text-2xl font-bold mb-4 text-center">Vote for the Best!</h2>
                <div className="grid grid-cols-2 gap-3">
                  {gameState.submissions.map((sub, i) => (
                    <div key={i} className="bg-gray-700 p-4 rounded-xl">
                      <p className="text-lg">&quot;{sub.caption}&quot;</p>
                    </div>
                  ))}
                </div>
                <p className="text-center text-gray-400 mt-4">
                  {gameState.voteCount} / {gameState.playerCount} voted
                </p>
              </div>
            )}

            {gameState.state === 'results' && results && (
              <div className="text-center">
                <h2 className="text-3xl font-bold text-yellow-400 mb-2">
                  {results.winner?.name} Wins!
                </h2>
                <p className="text-xl text-gray-300 mb-6">
                  &quot;{results.winningCaption}&quot;
                </p>
                <button
                  onClick={handleNextRound}
                  className="bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-xl font-semibold"
                >
                  Next Round
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Scoreboard */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Scoreboard</h3>
          <div className="space-y-2">
            {gameState.scores
              .sort((a, b) => b.score - a.score)
              .map((player, i) => (
                <div key={player.name} className="flex items-center gap-3 px-3 py-2 bg-gray-700/50 rounded-lg">
                  <span className={`w-6 text-center ${i === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {i === 0 ? '👑' : `${i + 1}.`}
                  </span>
                  <span className="flex-1">{player.name}</span>
                  <span className="text-accent font-bold">{player.score}</span>
                </div>
              ))}
          </div>

          {/* Vote Breakdown (in results) */}
          {gameState.state === 'results' && results?.voteCounts && (
            <div className="mt-6">
              <h4 className="text-sm text-gray-400 mb-2">Vote Breakdown</h4>
              <div className="space-y-2">
                {results.voteCounts.map((vc, i) => (
                  <div key={i} className="text-sm bg-gray-700/30 p-2 rounded">
                    <div className="flex justify-between">
                      <span>{vc.playerName}</span>
                      <span className="text-accent">{vc.votes} votes</span>
                    </div>
                    <p className="text-gray-500 text-xs truncate">&quot;{vc.caption}&quot;</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
