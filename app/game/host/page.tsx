'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '@/lib/socket';

interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
}

interface Room {
  code: string;
  players: Player[];
  gameState: string;
}

interface Submission {
  caption: string;
  playerId: string;
}

interface VoteCount {
  playerName: string;
  caption: string;
  votes: number;
}

export default function HostPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<string>('lobby');
  const [currentImage, setCurrentImage] = useState<string>('');
  const [round, setRound] = useState<number>(0);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionCount, setSubmissionCount] = useState<number>(0);
  const [voteCount, setVoteCount] = useState<number>(0);
  const [winner, setWinner] = useState<Player | null>(null);
  const [winningCaption, setWinningCaption] = useState<string>('');
  const [allScores, setAllScores] = useState<Array<{name: string; score: number}>>([]);
  const [voteCounts, setVoteCounts] = useState<VoteCount[]>([]);

  useEffect(() => {
    const socketInstance = io(getSocketUrl());

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      socketInstance.emit('create-room');
    });

    socketInstance.on('room-created', ({ roomCode, room }) => {
      console.log('Room created:', roomCode);
      setRoomCode(roomCode);
      setRoom(room);
    });

    socketInstance.on('room-updated', (updatedRoom) => {
      console.log('Room updated:', updatedRoom);
      setRoom(updatedRoom);
    });

    socketInstance.on('game-state-changed', (data) => {
      console.log('Game state changed:', data);
      setGameState(data.gameState);

      if (data.currentImage) setCurrentImage(data.currentImage);
      if (data.round) setRound(data.round);
      if (data.submissions) setSubmissions(data.submissions);
      if (data.winner) setWinner(data.winner);
      if (data.winningCaption) setWinningCaption(data.winningCaption);
      if (data.allScores) setAllScores(data.allScores);
      if (data.voteCounts) setVoteCounts(data.voteCounts);

      // Reset counts on state change
      setSubmissionCount(0);
      setVoteCount(0);
    });

    socketInstance.on('submission-received', (data) => {
      console.log('Submission received:', data);
      setSubmissionCount(data.totalSubmissions);
    });

    socketInstance.on('vote-recorded', (data) => {
      console.log('Vote recorded:', data);
      setVoteCount(data.votesReceived);
    });

    socketInstance.on('room-closed', () => {
      console.log('Room closed');
      setRoom(null);
      setRoomCode('');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const startGame = () => {
    if (socket && roomCode) {
      socket.emit('start-game', { roomCode });
    }
  };

  const nextRound = () => {
    if (socket && roomCode) {
      socket.emit('next-round', { roomCode });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-2">
            <span className="gradient-text">Caption Contest</span>
          </h1>
          {round > 0 && <p className="text-white/60 text-xl">Round {round}</p>}
        </div>

        {/* Room Code Display */}
        {roomCode && gameState === 'lobby' && (
          <div className="glass-strong rounded-3xl p-12 mb-8 text-center">
            <p className="text-white/80 text-2xl mb-4">Room Code:</p>
            <div className="text-8xl font-bold tracking-wider gradient-text mb-6">
              {roomCode}
            </div>
            <p className="text-white/60 text-lg">
              Players join at: <span className="text-circus-red">localhost:3001/game/join</span>
            </p>
          </div>
        )}

        {/* LOBBY STATE */}
        {gameState === 'lobby' && (
          <>
            <div className="glass-strong rounded-3xl p-8 mb-6">
              <h2 className="text-3xl font-bold mb-6 text-white">
                Players ({room?.players.length || 0})
              </h2>

              {room && room.players.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/60 text-xl">Waiting for players to join...</p>
                  <div className="mt-8 flex justify-center gap-2">
                    <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {room?.players.map((player) => (
                    <div
                      key={player.id}
                      className="glass rounded-2xl p-6 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-circus-red to-orange-500 flex items-center justify-center text-2xl font-bold">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-bold text-lg">{player.name}</p>
                          {player.isHost && (
                            <span className="text-circus-red text-sm">Host</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold gradient-text">{player.score}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {room && room.players.length >= 2 && (
              <div className="text-center">
                <button
                  onClick={startGame}
                  className="px-12 py-6 bg-gradient-to-r from-circus-red to-orange-500 rounded-full text-2xl font-bold hover:scale-105 transition-transform glow"
                >
                  Start Game
                </button>
              </div>
            )}
          </>
        )}

        {/* SUBMITTING STATE */}
        {gameState === 'submitting' && (
          <div className="space-y-6">
            {/* Image Display */}
            <div className="glass-strong rounded-3xl p-8">
              <h2 className="text-3xl font-bold mb-6 text-center gradient-text">
                Write a Funny Caption!
              </h2>
              <div className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImage}
                  alt="Caption this"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Submission Progress */}
            <div className="glass-strong rounded-3xl p-8 text-center">
              <h3 className="text-2xl font-bold mb-4 text-white">
                Waiting for Captions...
              </h3>
              <p className="text-4xl font-bold gradient-text">
                {submissionCount} / {room?.players.length || 0}
              </p>
              <div className="mt-6 flex justify-center gap-2">
                <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* VOTING STATE */}
        {gameState === 'voting' && (
          <div className="space-y-6">
            {/* Image */}
            <div className="glass-strong rounded-3xl p-8">
              <h2 className="text-3xl font-bold mb-6 text-center gradient-text">
                Vote for the Funniest Caption!
              </h2>
              <div className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden mb-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImage}
                  alt="Caption this"
                  className="w-full h-auto"
                />
              </div>

              {/* Captions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submissions.map((submission, index) => (
                  <div
                    key={index}
                    className="glass rounded-2xl p-6 text-center"
                  >
                    <p className="text-xl text-white italic">&quot;{submission.caption}&quot;</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Voting Progress */}
            <div className="glass-strong rounded-3xl p-8 text-center">
              <h3 className="text-2xl font-bold mb-4 text-white">
                Votes Cast...
              </h3>
              <p className="text-4xl font-bold gradient-text">
                {voteCount} / {room?.players.length || 0}
              </p>
            </div>
          </div>
        )}

        {/* RESULTS STATE */}
        {gameState === 'results' && (
          <div className="space-y-6">
            {/* Winner Display */}
            <div className="glass-strong rounded-3xl p-12 text-center">
              <div className="text-8xl mb-6">🏆</div>
              <h2 className="text-5xl font-bold mb-4 gradient-text">
                {winner?.name} Wins!
              </h2>
              <p className="text-3xl text-white/80 italic mb-8">
                &quot;{winningCaption}&quot;
              </p>

              {/* Image */}
              <div className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden mb-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImage}
                  alt="Round image"
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* All Results */}
            <div className="glass-strong rounded-3xl p-8">
              <h3 className="text-3xl font-bold mb-6 text-white">Round Results</h3>
              <div className="space-y-4">
                {voteCounts.map((result, index) => (
                  <div
                    key={index}
                    className="glass rounded-2xl p-6 flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <p className="text-white font-bold text-lg">{result.playerName}</p>
                      <p className="text-white/60 italic">&quot;{result.caption}&quot;</p>
                    </div>
                    <div className="text-2xl font-bold gradient-text">
                      {result.votes} {result.votes === 1 ? 'vote' : 'votes'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scoreboard */}
            <div className="glass-strong rounded-3xl p-8">
              <h3 className="text-3xl font-bold mb-6 text-white">Scoreboard</h3>
              <div className="space-y-3">
                {allScores
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div
                      key={index}
                      className="glass rounded-2xl p-6 flex justify-between items-center"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-bold text-white/40">
                          #{index + 1}
                        </span>
                        <span className="text-xl font-bold text-white">
                          {player.name}
                        </span>
                      </div>
                      <span className="text-3xl font-bold gradient-text">
                        {player.score}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Next Round Button */}
            <div className="text-center">
              <button
                onClick={nextRound}
                className="px-12 py-6 bg-gradient-to-r from-circus-red to-orange-500 rounded-full text-2xl font-bold hover:scale-105 transition-transform glow"
              >
                Next Round
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
