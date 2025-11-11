'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

interface Player {
  id: string;
  name: string;
  position: { x: number; y: number };
  hasWon: boolean;
  moveCount: number;
}

interface Room {
  code: string;
  players: Player[];
  gameState: 'lobby' | 'playing' | 'results';
  currentLevel: number;
  board: number[][];
  targetPosition: { x: number; y: number };
  myPlayerId?: string;
}

export default function AbductionPlayPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Get stored room info
    const roomCode = localStorage.getItem('abducktion-room-code');
    const playerId = localStorage.getItem('abducktion-player-id');
    const playerName = localStorage.getItem('abducktion-player-name');

    if (!roomCode || !playerId || !playerName) {
      router.push('/abducktion/join');
      return;
    }

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('rejoin-abducktion-room', {
        roomCode,
        playerId,
        playerName,
        isHost: false
      });
    });

    newSocket.on('abducktion-room-updated', (data: Room) => {
      console.log('Room updated:', data);
      setRoom({ ...data, myPlayerId: playerId });
      const player = data.players.find(p => p.id === playerId);
      if (player) {
        setMyPlayer(player);
      }
    });

    newSocket.on('abducktion-game-state-changed', (data: Room) => {
      console.log('Game state changed:', data);
      setRoom({ ...data, myPlayerId: playerId });
      const player = data.players.find(p => p.id === playerId);
      if (player) {
        setMyPlayer(player);
      }
    });

    newSocket.on('error', (message: string) => {
      console.error('Error:', message);
      setError(message);
    });

    newSocket.on('disconnect', () => {
      setError('Disconnected from server');
    });

    return () => {
      newSocket.disconnect();
    };
  }, [router]);

  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (socket && room && myPlayer && !myPlayer.hasWon) {
      socket.emit('abducktion-move', {
        roomCode: room.code,
        direction
      });
    }
  };

  const canMove = (direction: 'up' | 'down' | 'left' | 'right'): boolean => {
    if (!myPlayer || !room) return false;

    const { x, y } = myPlayer.position;
    let newX = x;
    let newY = y;

    switch (direction) {
      case 'up':
        newY = y - 1;
        break;
      case 'down':
        newY = y + 1;
        break;
      case 'left':
        newX = x - 1;
        break;
      case 'right':
        newX = x + 1;
        break;
    }

    // Check bounds
    if (newY < 0 || newY >= room.board.length || newX < 0 || newX >= room.board[0].length) {
      return false;
    }

    return true;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 text-center">
          <p className="text-red-400 text-xl mb-4">{error}</p>
          <button
            onClick={() => router.push('/abducktion/join')}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold rounded-lg"
          >
            Back to Join
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 text-transparent bg-clip-text">
            ABDUCKTION
          </h1>
          {myPlayer && (
            <p className="text-2xl text-white font-bold">{myPlayer.name}</p>
          )}
        </div>

        {/* Lobby */}
        {room.gameState === 'lobby' && (
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Waiting for game to start...</h2>
            <p className="text-xl text-gray-300 mb-6">Room: {room.code}</p>
            <div className="space-y-3">
              <p className="text-lg text-gray-300">Players ({room.players.length}):</p>
              {room.players.map((player) => (
                <div key={player.id} className="backdrop-blur-xl bg-white/10 rounded-lg p-3 border border-white/20">
                  <p className="text-white font-bold">{player.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Playing */}
        {room.gameState === 'playing' && myPlayer && (
          <div>
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20 mb-6 text-center">
              <p className="text-lg text-gray-300 mb-2">Level {room.currentLevel}</p>
              <p className="text-xl text-white font-bold mb-2">Moves: {myPlayer.moveCount}</p>
              {myPlayer.hasWon && (
                <p className="text-2xl text-green-400 font-bold">✓ You finished!</p>
              )}
            </div>

            {/* Game Board */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20 mb-6">
              <div className="bg-black/30 p-3 rounded-lg inline-block mx-auto">
                {room.board.map((row, y) => (
                  <div key={y} className="flex">
                    {row.map((cell, x) => {
                      const isPlayer = myPlayer.position.x === x && myPlayer.position.y === y;
                      const isTarget = room.targetPosition.x === x && room.targetPosition.y === y;
                      const isBlock = cell === 1;

                      return (
                        <div
                          key={x}
                          className="w-12 h-12 sm:w-14 sm:h-14 border border-gray-600 flex items-center justify-center text-3xl"
                        >
                          {isPlayer && <span className="animate-pulse">👽</span>}
                          {isTarget && !isPlayer && <span>🛸</span>}
                          {isBlock && !isPlayer && !isTarget && (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 rounded-sm"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4 text-center">Controls</h3>
              <p className="text-sm text-gray-300 mb-6 text-center">
                Jump over blocks to remove them. Reach the UFO! 🛸
              </p>
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => handleMove('up')}
                  disabled={myPlayer.hasWon || !canMove('up')}
                  className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold text-3xl rounded-lg transition-all transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  ↑
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMove('left')}
                    disabled={myPlayer.hasWon || !canMove('left')}
                    className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold text-3xl rounded-lg transition-all transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => handleMove('down')}
                    disabled={myPlayer.hasWon || !canMove('down')}
                    className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold text-3xl rounded-lg transition-all transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleMove('right')}
                    disabled={myPlayer.hasWon || !canMove('right')}
                    className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold text-3xl rounded-lg transition-all transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {room.gameState === 'results' && (
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">Level Complete!</h2>
            <p className="text-xl text-gray-300 mb-8">Waiting for next level...</p>
            {myPlayer && myPlayer.hasWon && (
              <div className="mb-6">
                <p className="text-2xl text-green-400 font-bold">You finished!</p>
                <p className="text-lg text-white">Moves: {myPlayer.moveCount}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
