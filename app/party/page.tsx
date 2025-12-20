'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ConnectionStatus } from './components/ConnectionStatus';

export default function PartyLandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
      <ConnectionStatus />

      <div className="text-center mb-12">
        <Image
          src="/images/clowncode-logo.png"
          alt="Clown Code"
          width={350}
          height={120}
          className="mx-auto mb-6"
          priority
        />
        <p className="text-[var(--muted)] text-lg">
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
          className="flex-1 border-2 border-[var(--border)] hover:border-accent text-[var(--foreground)] font-semibold py-4 px-8 rounded-xl text-center text-lg transition-colors"
        >
          Join a Game
        </Link>
      </div>

      <div className="mt-16 text-center text-[var(--muted)] text-sm">
        <p>Host opens on a TV or laptop</p>
        <p>Players join on their phones</p>
      </div>
    </div>
  );
}
