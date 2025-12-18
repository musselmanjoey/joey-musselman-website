'use client';

import Link from 'next/link';
import { ConnectionStatus } from './components/ConnectionStatus';

export default function PartyLandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <ConnectionStatus />

      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Party Games
        </h1>
        <p className="text-gray-400 text-lg">
          Jackbox-style multiplayer fun
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Link
          href="/party/host"
          className="flex-1 bg-accent hover:bg-accent-hover text-white font-semibold py-4 px-8 rounded-xl text-center text-lg transition-colors"
        >
          Host a Game
        </Link>
        <Link
          href="/party/play"
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-8 rounded-xl text-center text-lg transition-colors"
        >
          Join a Game
        </Link>
      </div>

      <div className="mt-16 text-center text-gray-500 text-sm">
        <p>Host opens on a TV or laptop</p>
        <p>Players join on their phones</p>
      </div>
    </div>
  );
}
