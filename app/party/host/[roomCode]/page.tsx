'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useSocket } from '../../components/SocketProvider';
import { RoomCodeDisplay } from '../../components/RoomCodeDisplay';
import { PlayerList } from '../../components/PlayerList';
import { GameSelector } from '../../components/GameSelector';
import { ConnectionStatus } from '../../components/ConnectionStatus';

interface Game {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

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

export default function HostLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  const { socket, isConnected } = useSocket();

  const [room, setRoom] = useState<Room | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string>('');

  // Set join URL on client side (goes to join page with code pre-filled)
  useEffect(() => {
    setJoinUrl(`${window.location.origin}/party/play?code=${roomCode}`);
  }, [roomCode]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Request room state and games list
    socket.emit('get-games');
    socket.emit('rejoin-room', { roomCode });

    function onGamesList(gamesList: Game[]) {
      setGames(gamesList);
    }

    function onRoomRejoined({ room: roomData }: { room: Room }) {
      setRoom(roomData);
      if (roomData.gameType) {
        setSelectedGame(roomData.gameType);
      }
    }

    function onRoomUpdated(roomData: Room) {
      setRoom(roomData);
    }

    function onGameSelected({ gameType }: { gameType: string }) {
      setSelectedGame(gameType);
    }

    function onGameStarted({ gameType }: { gameType: string }) {
      router.push(`/party/host/${roomCode}/${gameType}`);
    }

    function onError({ message }: { message: string }) {
      setError(message);
    }

    socket.on('games-list', onGamesList);
    socket.on('room-rejoined', onRoomRejoined);
    socket.on('room-updated', onRoomUpdated);
    socket.on('game-selected', onGameSelected);
    socket.on('game-started', onGameStarted);
    socket.on('error', onError);

    return () => {
      socket.off('games-list', onGamesList);
      socket.off('room-rejoined', onRoomRejoined);
      socket.off('room-updated', onRoomUpdated);
      socket.off('game-selected', onGameSelected);
      socket.off('game-started', onGameStarted);
      socket.off('error', onError);
    };
  }, [socket, isConnected, roomCode, router]);

  function handleSelectGame(gameId: string) {
    if (!socket) return;
    setSelectedGame(gameId);
    socket.emit('select-game', { roomCode, gameType: gameId });
  }

  function handleStartGame() {
    if (!socket || !selectedGame) return;
    socket.emit('start-game', { roomCode });
  }

  const playerCount = room?.players.length || 0;
  const selectedGameInfo = games.find(g => g.id === selectedGame);
  const canStart = selectedGame &&
    selectedGameInfo &&
    playerCount >= selectedGameInfo.minPlayers &&
    playerCount <= selectedGameInfo.maxPlayers;

  return (
    <div className="min-h-screen p-8 bg-white">
      <ConnectionStatus />

      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Room Code & QR */}
        <div className="flex flex-col items-center mb-12 gap-6">
          <RoomCodeDisplay code={roomCode} />
          {joinUrl && (
            <div className="border-2 border-[var(--border)] p-4 rounded-xl">
              <QRCodeSVG value={joinUrl} size={160} />
            </div>
          )}
          <p className="text-[var(--muted)] text-sm">Scan to join on your phone</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Game Selection */}
          <div>
            <GameSelector
              games={games}
              selectedGame={selectedGame}
              onSelect={handleSelectGame}
              playerCount={playerCount}
            />
          </div>

          {/* Right: Players */}
          <div>
            <PlayerList
              players={room?.players || []}
              maxPlayers={selectedGameInfo?.maxPlayers}
            />
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleStartGame}
            disabled={!canStart}
            className={`
              bg-accent hover:bg-accent-hover text-white font-bold
              py-4 px-16 rounded-xl text-xl transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {!selectedGame
              ? 'Select a Game'
              : !canStart
                ? `Need ${selectedGameInfo?.minPlayers} Players`
                : 'Start Game'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
