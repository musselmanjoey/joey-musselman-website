'use client';

import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the debug wrapper (Phaser needs client-side only)
const GameDebugWrapper = dynamic(
  () => import('@/lib/clown-club/debug/GameDebugWrapper'),
  { ssr: false }
);

function DebugPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const game = params.game as string;
  const phase = searchParams.get('phase') || 'lobby';
  const role = searchParams.get('role') || 'guesser';
  const viewport = searchParams.get('viewport') || 'mobile'; // mobile | host

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Control Panel */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-neutral-800 border-b border-neutral-700 p-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-4 text-sm">
          <span className="font-bold text-red-500">DEBUG MODE</span>
          <span className="text-neutral-400">Game: <span className="text-white">{game}</span></span>
          <span className="text-neutral-400">Phase: <span className="text-white">{phase}</span></span>
          <span className="text-neutral-400">Role: <span className="text-white">{role}</span></span>
          <span className="text-neutral-400">Viewport: <span className="text-white">{viewport}</span></span>
        </div>
      </div>

      {/* Game Container */}
      <div className="pt-14 flex justify-center items-start min-h-screen">
        <GameDebugWrapper
          game={game}
          phase={phase}
          role={role}
          viewport={viewport}
        />
      </div>
    </div>
  );
}

export default function DebugPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Loading debug mode...</div>}>
      <DebugPageContent />
    </Suspense>
  );
}
