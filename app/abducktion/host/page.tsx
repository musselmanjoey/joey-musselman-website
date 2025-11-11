'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';

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
  winner?: Player;
}

export default function AbductionHostPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Try to rejoin existing room from localStorage
    const savedRoomCode = localStorage.getItem('abducktion-host-room-code');
    if (savedRoomCode) {
      newSocket.on('connect', () => {
        newSocket.emit('rejoin-abducktion-room', { roomCode: savedRoomCode, isHost: true });
      });
    } else {
      newSocket.on('connect', () => {
        newSocket.emit('create-abducktion-room');
      });
    }

    newSocket.on('abducktion-room-created', (data: Room) => {
      console.log('Room created:', data);
      setRoom(data);
      localStorage.setItem('abducktion-host-room-code', data.code);
      setIsLoading(false);
    });

    newSocket.on('abducktion-room-updated', (data: Room) => {
      console.log('Room updated:', data);
      setRoom(data);
    });

    newSocket.on('abducktion-game-state-changed', (data: Room) => {
      console.log('Game state changed:', data);
      setRoom(data);
    });

    newSocket.on('error', (message: string) => {
      console.error('Error:', message);
      setError(message);
      setIsLoading(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const startGame = () => {
    if (socket && room) {
      socket.emit('start-abducktion-game', { roomCode: room.code });
    }
  };

  const nextLevel = () => {
    if (socket && room) {
      socket.emit('next-abducktion-level', { roomCode: room.code });
    }
  };

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/abducktion/join` : '';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Creating room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20">
          <p className="text-red-400 text-xl">{error}</p>
        </div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 text-transparent bg-clip-text">
            ABDUCKTION
          </h1>
          {room.gameState === 'lobby' && (
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 inline-block border border-white/20">
              <p className="text-gray-300 text-lg mb-4">Room Code:</p>
              <p className="text-6xl font-bold text-white tracking-widest mb-6">{room.code}</p>
              <div className="bg-white p-4 rounded-xl inline-block mb-4">
                <QRCodeSVG value={joinUrl} size={200} />
              </div>
              <p className="text-gray-400 text-sm">Scan to join on mobile</p>
              <p className="text-gray-400 text-sm mt-2">{joinUrl}</p>
            </div>
          )}
        </div>

        {/* Lobby */}
        {room.gameState === 'lobby' && (
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-6">Players ({room.players.length})</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {room.players.map((player) => (
                <div key={player.id} className="backdrop-blur-xl bg-white/10 rounded-lg p-4 border border-white/20">
                  <p className="text-white font-bold truncate">{player.name}</p>
                </div>
              ))}
            </div>
            <button
              onClick={startGame}
              disabled={room.players.length < 1}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed text-xl"
            >
              {room.players.length < 1 ? 'Waiting for players...' : 'Start Game'}
            </button>
          </div>
        )}

        {/* Playing */}
        {room.gameState === 'playing' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white">Level {room.currentLevel}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {room.players.map((player) => (
                <PlayerBoard
                  key={player.id}
                  player={player}
                  board={room.board}
                  targetPosition={room.targetPosition}
                />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {room.gameState === 'results' && room.winner && (
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 text-center">
            <h2 className="text-5xl font-bold text-yellow-400 mb-4">🏆 Winner!</h2>
            <p className="text-4xl font-bold text-white mb-2">{room.winner.name}</p>
            <p className="text-2xl text-gray-300 mb-8">Completed in {room.winner.moveCount} moves</p>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">Final Standings</h3>
              <div className="space-y-3">
                {room.players
                  .sort((a, b) => {
                    if (a.hasWon && !b.hasWon) return -1;
                    if (!a.hasWon && b.hasWon) return 1;
                    return a.moveCount - b.moveCount;
                  })
                  .map((player, index) => (
                    <div key={player.id} className="backdrop-blur-xl bg-white/10 rounded-lg p-4 border border-white/20 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                        <span className="text-xl font-bold text-white">{player.name}</span>
                      </div>
                      <span className="text-lg text-gray-300">
                        {player.hasWon ? `${player.moveCount} moves` : 'Did not finish'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <button
              onClick={nextLevel}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold rounded-lg transition-all transform hover:scale-105 text-xl"
            >
              Next Level
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerBoard({ player, board, targetPosition }: { player: Player; board: number[][]; targetPosition: { x: number; y: number } }) {
  const cellSize = 'w-10 h-10 md:w-12 md:h-12';

  return (
    <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20">
      <div className="mb-4">
        <p className="text-xl font-bold text-white truncate">{player.name}</p>
        <p className="text-sm text-gray-300">Moves: {player.moveCount}</p>
        {player.hasWon && <p className="text-green-400 font-bold">✓ Finished!</p>}
      </div>
      <div className="inline-block bg-black/30 p-2 rounded-lg">
        {board.map((row, y) => (
          <div key={y} className="flex">
            {row.map((cell, x) => {
              const isPlayer = player.position.x === x && player.position.y === y;
              const isTarget = targetPosition.x === x && targetPosition.y === y;
              const isBlock = cell === 1;

              return (
                <div
                  key={x}
                  className={`${cellSize} border border-gray-600 flex items-center justify-center text-2xl`}
                >
                  {isPlayer && <span>👽</span>}
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
  );
}
