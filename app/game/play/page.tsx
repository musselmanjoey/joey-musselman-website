'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

interface Submission {
  caption: string;
  playerId: string;
}

function PlayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('room');
  const playerName = searchParams.get('name');

  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [gameState, setGameState] = useState('lobby');
  const [currentImage, setCurrentImage] = useState('');
  const [caption, setCaption] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [myId, setMyId] = useState('');

  useEffect(() => {
    if (!roomCode || !playerName) {
      router.push('/game/join');
      return;
    }

    const socketInstance = io('http://localhost:3001');

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      setMyId(socketInstance.id);
      socketInstance.emit('join-room', { roomCode, playerName });
    });

    socketInstance.on('joined-room', ({ room }) => {
      console.log('Joined room:', room);
      setJoined(true);
      setGameState(room.gameState);
    });

    socketInstance.on('room-updated', (room) => {
      console.log('Room updated:', room);
      setGameState(room.gameState);
    });

    socketInstance.on('game-state-changed', (data) => {
      console.log('Game state changed:', data);
      setGameState(data.gameState);

      if (data.currentImage) setCurrentImage(data.currentImage);
      if (data.submissions) setSubmissions(data.submissions);

      // Reset on new round
      if (data.gameState === 'submitting') {
        setCaption('');
        setHasSubmitted(false);
        setHasVoted(false);
      }
    });

    socketInstance.on('error', ({ message }) => {
      console.error('Error:', message);
      setError(message);
      setTimeout(() => {
        router.push('/game/join');
      }, 3000);
    });

    socketInstance.on('room-closed', ({ message }) => {
      setError(message);
      setTimeout(() => {
        router.push('/game/join');
      }, 3000);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [roomCode, playerName, router]);

  const submitCaption = () => {
    if (socket && caption.trim() && roomCode) {
      socket.emit('submit-caption', { roomCode, caption: caption.trim() });
      setHasSubmitted(true);
    }
  };

  const vote = (playerId: string) => {
    if (socket && roomCode && !hasVoted) {
      socket.emit('vote-caption', { roomCode, votedForId: playerId });
      setHasVoted(true);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="glass-strong border-2 border-red-500 rounded-3xl p-12 max-w-md w-full text-center">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-3xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-white/80 text-lg">{error}</p>
          <p className="text-white/60 text-sm mt-4">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="glass-strong rounded-3xl p-12 max-w-md w-full text-center">
          <div className="mb-8">
            <div className="w-16 h-16 border-4 border-circus-red border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
          <h2 className="text-3xl font-bold gradient-text mb-4">Joining...</h2>
          <p className="text-white/60">Room: {roomCode}</p>
          <p className="text-white/60">Player: {playerName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Player Info */}
        <div className="glass-strong rounded-3xl p-6 mb-6 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-circus-red to-orange-500 flex items-center justify-center text-4xl font-bold">
            {playerName?.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{playerName}</h2>
          <p className="text-white/60">Room: {roomCode}</p>
        </div>

        {/* LOBBY STATE */}
        {gameState === 'lobby' && (
          <div className="glass-strong rounded-3xl p-8 text-center">
            <div className="text-6xl mb-6">🎮</div>
            <h3 className="text-3xl font-bold gradient-text mb-4">Waiting for Host</h3>
            <p className="text-white/60 text-lg mb-6">
              The game will start soon...
            </p>
            <div className="flex justify-center gap-2">
              <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        {/* SUBMITTING STATE */}
        {gameState === 'submitting' && (
          <div className="glass-strong rounded-3xl p-8">
            {!hasSubmitted ? (
              <>
                <h3 className="text-3xl font-bold gradient-text mb-6 text-center">
                  Write a Funny Caption!
                </h3>

                {/* Show the image */}
                {currentImage && (
                  <div className="relative w-full rounded-2xl overflow-hidden mb-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentImage}
                      alt="Caption this"
                      className="w-full h-auto"
                    />
                  </div>
                )}

                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-6 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-circus-red transition-colors resize-none mb-2"
                  rows={4}
                  placeholder="Type your funny caption here..."
                  maxLength={200}
                />
                <p className="text-white/40 text-sm mb-4 text-right">
                  {caption.length}/200 characters
                </p>

                <button
                  onClick={submitCaption}
                  disabled={!caption.trim()}
                  className="w-full px-8 py-4 bg-gradient-to-r from-circus-red to-orange-500 rounded-full text-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Submit Caption
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-6">✅</div>
                <h3 className="text-3xl font-bold gradient-text mb-4">Caption Submitted!</h3>
                <p className="text-white/60 text-lg mb-6">
                  Waiting for other players...
                </p>
                <div className="glass rounded-2xl p-6 mb-6">
                  <p className="text-white/80 italic">"{caption}"</p>
                </div>
                <div className="flex justify-center gap-2">
                  <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VOTING STATE */}
        {gameState === 'voting' && (
          <div className="glass-strong rounded-3xl p-8">
            {!hasVoted ? (
              <>
                <h3 className="text-3xl font-bold gradient-text mb-6 text-center">
                  Vote for the Funniest!
                </h3>

                {/* Show image */}
                {currentImage && (
                  <div className="relative w-full rounded-2xl overflow-hidden mb-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentImage}
                      alt="Caption this"
                      className="w-full h-auto"
                    />
                  </div>
                )}

                <p className="text-white/60 text-center mb-6">
                  Tap a caption to vote (you can't vote for yourself!)
                </p>

                <div className="space-y-3">
                  {submissions.map((submission, index) => (
                    <button
                      key={index}
                      onClick={() => vote(submission.playerId)}
                      disabled={submission.playerId === myId}
                      className={`w-full glass rounded-2xl p-6 text-center transition-all ${
                        submission.playerId === myId
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-white/20 hover:scale-105 cursor-pointer'
                      }`}
                    >
                      <p className="text-lg text-white italic">"{submission.caption}"</p>
                      {submission.playerId === myId && (
                        <p className="text-circus-red text-sm mt-2">Your caption</p>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-6">🗳️</div>
                <h3 className="text-3xl font-bold gradient-text mb-4">Vote Cast!</h3>
                <p className="text-white/60 text-lg mb-6">
                  Waiting for other players to vote...
                </p>
                <div className="flex justify-center gap-2">
                  <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESULTS STATE */}
        {gameState === 'results' && (
          <div className="glass-strong rounded-3xl p-8 text-center">
            <div className="text-6xl mb-6">🏆</div>
            <h3 className="text-3xl font-bold gradient-text mb-4">Round Over!</h3>
            <p className="text-white/60 text-lg mb-6">
              Check the host screen for results!
            </p>
            <div className="flex justify-center gap-2">
              <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-circus-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        {/* Leave Game Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              socket?.disconnect();
              router.push('/game/join');
            }}
            className="text-white/60 hover:text-white transition-colors"
          >
            Leave Game
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="glass-strong rounded-3xl p-12">
          <div className="w-16 h-16 border-4 border-circus-red border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    }>
      <PlayPageContent />
    </Suspense>
  );
}
