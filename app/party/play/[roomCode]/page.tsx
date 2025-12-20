'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '../../components/SocketProvider';
import { ConnectionStatus } from '../../components/ConnectionStatus';

interface Player {
  id: string;
  name: string;
  isHost?: boolean;
}

interface Room {
  code: string;
  gameType: string | null;
  players: Player[];
}

interface GameInfo {
  id: string;
  name: string;
  description: string;
}

export default function PlayerLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  const { socket, isConnected } = useSocket();

  const [room, setRoom] = useState<Room | null>(null);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [myName, setMyName] = useState<string>('');

  useEffect(() => {
    // Get player name from session storage
    const storedName = sessionStorage.getItem('playerName');
    if (storedName) {
      setMyName(storedName);
    }
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Get stored player name and rejoin if needed
    const storedName = sessionStorage.getItem('playerName');
    if (storedName) {
      // Re-emit join in case we disconnected during navigation
      socket.emit('join-room', { roomCode, playerName: storedName });
    }

    // Request current state
    socket.emit('request-state', { roomCode });

    function onStateUpdate({ room: roomData }: { room: Room }) {
      setRoom(roomData);
    }

    function onRoomUpdated(roomData: Room) {
      setRoom(roomData);
    }

    function onGameSelected({ gameInfo: info }: { gameInfo: GameInfo }) {
      setGameInfo(info);
    }

    function onGameStarted({ gameType }: { gameType: string }) {
      router.push(`/party/play/${roomCode}/${gameType}`);
    }

    function onRoomClosed() {
      router.push('/party/play?error=room-closed');
    }

    socket.on('state-update', onStateUpdate);
    socket.on('room-updated', onRoomUpdated);
    socket.on('game-selected', onGameSelected);
    socket.on('game-started', onGameStarted);
    socket.on('room-closed', onRoomClosed);

    return () => {
      socket.off('state-update', onStateUpdate);
      socket.off('room-updated', onRoomUpdated);
      socket.off('game-selected', onGameSelected);
      socket.off('game-started', onGameStarted);
      socket.off('room-closed', onRoomClosed);
    };
  }, [socket, isConnected, roomCode, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
      <ConnectionStatus />

      <div className="text-center mb-8">
        <div className="inline-block bg-gray-50 border border-[var(--border)] px-4 py-2 rounded-lg mb-4">
          <span className="text-2xl font-mono tracking-wider text-[var(--foreground)]">{roomCode}</span>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-[var(--foreground)]">
          {myName ? `Welcome, ${myName}!` : 'Joined!'}
        </h1>
      </div>

      {/* Waiting State */}
      <div className="bg-gray-50 border border-[var(--border)] rounded-xl p-8 text-center max-w-sm w-full">
        {gameInfo ? (
          <>
            <div className="mb-4">
              <p className="text-[var(--muted)] text-sm">Selected Game</p>
              <h2 className="text-2xl font-bold text-accent">{gameInfo.name}</h2>
            </div>
            <div className="flex items-center justify-center gap-2 text-[var(--muted)]">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Waiting for host to start...</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 text-[var(--muted)] mb-4">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span>Waiting for host to select a game...</span>
            </div>
            <p className="text-[var(--muted)] text-sm">
              Look at the TV screen to see what's happening
            </p>
          </>
        )}
      </div>

      {/* Player Count */}
      {room && (
        <div className="mt-8 text-[var(--muted)] text-sm">
          {room.players.length} player{room.players.length !== 1 ? 's' : ''} in room
        </div>
      )}
    </div>
  );
}
