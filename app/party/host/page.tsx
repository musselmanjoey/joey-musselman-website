'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '../components/SocketProvider';
import { ConnectionStatus } from '../components/ConnectionStatus';

export default function HostPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!socket) return;

    function onRoomCreated({ roomCode }: { roomCode: string }) {
      // Store room code in sessionStorage for reconnection
      sessionStorage.setItem('hostRoomCode', roomCode);
      router.push(`/party/host/${roomCode}`);
    }

    socket.on('room-created', onRoomCreated);

    return () => {
      socket.off('room-created', onRoomCreated);
    };
  }, [socket, router]);

  function handleCreateRoom() {
    if (!socket || !isConnected) return;
    setIsCreating(true);
    socket.emit('create-room', {});
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <ConnectionStatus />

      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Host a Game</h1>
        <p className="text-gray-400">
          Create a room and invite your friends
        </p>
      </div>

      <button
        onClick={handleCreateRoom}
        disabled={!isConnected || isCreating}
        className={`
          bg-accent hover:bg-accent-hover text-white font-semibold
          py-4 px-12 rounded-xl text-xl transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isCreating ? 'animate-pulse' : ''}
        `}
      >
        {isCreating ? 'Creating Room...' : 'Create Room'}
      </button>

      {!isConnected && (
        <p className="mt-4 text-yellow-500 text-sm">
          Connecting to server...
        </p>
      )}
    </div>
  );
}
