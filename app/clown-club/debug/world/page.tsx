'use client';

import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { ZoneId, WorldScenario } from '@/lib/clown-club/debug/worldMockData';

// Dynamically import the debug wrapper (Phaser needs client-side only)
const WorldDebugWrapper = dynamic(
  () => import('@/lib/clown-club/debug/WorldDebugWrapper'),
  { ssr: false }
);

function WorldDebugPageContent() {
  const searchParams = useSearchParams();

  const zone = (searchParams.get('zone') || 'lobby') as ZoneId;
  const scenario = (searchParams.get('scenario') || 'default') as WorldScenario;
  const viewport = searchParams.get('viewport') || 'desktop';

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Control Panel */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-neutral-800 border-b border-neutral-700 p-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-4 text-sm">
          <span className="font-bold text-red-500">DEBUG MODE</span>
          <span className="text-neutral-400">Type: <span className="text-white">World</span></span>
          <span className="text-neutral-400">Zone: <span className="text-white">{zone}</span></span>
          <span className="text-neutral-400">Scenario: <span className="text-white">{scenario}</span></span>
          <span className="text-neutral-400">Viewport: <span className="text-white">{viewport}</span></span>
        </div>
      </div>

      {/* Game Container */}
      <div className="pt-14 flex justify-center items-start min-h-screen">
        <WorldDebugWrapper
          zone={zone}
          scenario={scenario}
          viewport={viewport}
        />
      </div>
    </div>
  );
}

export default function WorldDebugPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Loading debug mode...</div>}>
      <WorldDebugPageContent />
    </Suspense>
  );
}
