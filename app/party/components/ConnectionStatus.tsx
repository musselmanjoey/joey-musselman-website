'use client';

import { useSocket } from './SocketProvider';

export function ConnectionStatus() {
  const { isConnected, error } = useSocket();

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
        Connection error: {error}
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="fixed bottom-4 right-4 bg-yellow-500/90 text-black px-4 py-2 rounded-lg text-sm flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
        Connecting...
      </div>
    );
  }

  return null;
}
