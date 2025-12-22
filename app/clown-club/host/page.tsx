'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { connectSocket, resetSocket } from '@/lib/clown-club/socket';
import { Socket } from 'socket.io-client';

// Dynamic import for Phaser (client-only)
const HostPhaserWrapper = dynamic(
  () => import('@/lib/clown-club/phaser/HostPhaserWrapper').then((mod) => mod.HostPhaserWrapper),
  { ssr: false, loading: () => <LoadingScreen /> }
);

function LoadingScreen() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="text-6xl mb-4">📺</div>
        <p className="text-white text-xl">Loading TV Display...</p>
      </div>
    </div>
  );
}

export default function HostPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode] = useState('LOBBY');
  const [gameActive, setGameActive] = useState(false);
  const [gameType, setGameType] = useState<string | undefined>(undefined);
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    const s = connectSocket();
    setSocket(s);

    const handleConnected = () => {
      setIsConnected(true);
      // Join as spectator, not as a player
      s.emit('cc:join-spectator', { roomCode });
    };

    if (s.connected) {
      handleConnected();
    }

    s.on('connect', handleConnected);

    s.on('cc:spectator-joined', (data: { roomCode: string; playerCount: number }) => {
      console.log('[Host] Joined as spectator:', data);
      setPlayerCount(data.playerCount);
    });

    s.on('cc:player-joined', (data: unknown) => {
      console.log('[Host] Player joined:', data);
      setPlayerCount(prev => prev + 1);
    });

    s.on('cc:player-left', (data: unknown) => {
      console.log('[Host] Player left:', data);
      setPlayerCount(prev => Math.max(0, prev - 1));
    });

    s.on('game:started', (data: { gameType?: string }) => {
      console.log('[Host] Game started:', data);
      setGameActive(true);
      setGameType(data?.gameType);
    });

    s.on('game:ended', (data: unknown) => {
      console.log('[Host] Game ended:', data);
      setGameActive(false);
      setGameType(undefined);
    });

    // Debug: log all events
    s.onAny((event: string, data: unknown) => {
      console.log('[Host] Event:', event, data);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      s.off('connect', handleConnected);
      s.off('cc:spectator-joined');
      s.off('cc:player-joined');
      s.off('cc:player-left');
      s.off('game:started');
      s.off('game:ended');
      s.off('disconnect');
      s.offAny();
      resetSocket();
    };
  }, [roomCode]);

  if (!socket || !isConnected) {
    return <LoadingScreen />;
  }

  return (
    <div className="w-full h-screen bg-gray-900 overflow-hidden">
      {/* Connection status */}
      <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
        <span className="text-white text-sm">{playerCount} players</span>
        <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
      </div>

      {/* Logo and QR Code */}
      <div className="fixed top-4 left-4 z-20 flex items-start gap-4">
        <div className="bg-white p-4 rounded-xl shadow-lg">
          <Image
            src="/images/clowncode-logo.png"
            alt="Clown Code"
            width={140}
            height={48}
            className="mb-3"
          />
          <QRCodeSVG
            value="https://joeymusselman.com/clown-club"
            size={120}
            level="M"
            fgColor="#dc2626"
          />
          <p className="text-xs text-center mt-2 text-[var(--muted)] font-medium">Scan to join</p>
        </div>
      </div>

      {/* Phaser game display */}
      <HostPhaserWrapper socket={socket} gameActive={gameActive} gameType={gameType} />
    </div>
  );
}
