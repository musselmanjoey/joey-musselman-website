'use client';

import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { getMockData, getPhases, GameMockData } from './mockData';

interface GameDebugWrapperProps {
  game: string;
  phase: string;
  role: string;
  viewport: string;
}

// Viewport sizes
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },  // iPhone SE
  tablet: { width: 768, height: 1024 }, // iPad
  host: { width: 1280, height: 720 },   // TV/Host display
};

export default function GameDebugWrapper({ game, phase, role, viewport }: GameDebugWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [currentPhase, setCurrentPhase] = useState(phase);
  const [currentRole, setCurrentRole] = useState(role);
  const [error, setError] = useState<string | null>(null);

  const viewportSize = VIEWPORTS[viewport as keyof typeof VIEWPORTS] || VIEWPORTS.mobile;
  const phases = getPhases(game);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const initGame = async () => {
      try {
        // Dynamically import the debug scene for this game
        const sceneModule = await import(`./scenes/${game}DebugScene`);
        const DebugScene = sceneModule.default;

        // Get mock data for current state
        const mockData = getMockData(game, currentPhase, currentRole);

        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          parent: containerRef.current!,
          width: viewportSize.width,
          height: viewportSize.height,
          backgroundColor: '#ffffff',
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          scene: DebugScene,
        };

        gameRef.current = new Phaser.Game(config);

        // Pass mock data to the scene via registry
        gameRef.current.registry.set('debugMode', true);
        gameRef.current.registry.set('mockData', mockData);
        gameRef.current.registry.set('phase', currentPhase);
        gameRef.current.registry.set('role', currentRole);
        gameRef.current.registry.set('viewport', viewport);

      } catch (err) {
        console.error('Failed to load debug scene:', err);
        setError(`No debug scene found for game: ${game}`);
      }
    };

    initGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [game, viewport]); // Only recreate on game or viewport change

  // Update scene when phase/role changes (without recreating game)
  useEffect(() => {
    if (gameRef.current && gameRef.current.scene.isActive(`${game}DebugScene`)) {
      const scene = gameRef.current.scene.getScene(`${game}DebugScene`);
      if (scene) {
        const mockData = getMockData(game, currentPhase, currentRole);
        gameRef.current.registry.set('mockData', mockData);
        gameRef.current.registry.set('phase', currentPhase);
        gameRef.current.registry.set('role', currentRole);
        // Emit event to scene to update
        scene.events.emit('debug:update', { phase: currentPhase, role: currentRole, mockData });
      }
    }
  }, [game, currentPhase, currentRole]);

  const handlePhaseChange = (newPhase: string) => {
    setCurrentPhase(newPhase);
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('phase', newPhase);
    window.history.replaceState({}, '', url.toString());
  };

  const handleRoleChange = (newRole: string) => {
    setCurrentRole(newRole);
    const url = new URL(window.location.href);
    url.searchParams.set('role', newRole);
    window.history.replaceState({}, '', url.toString());
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-red-500 text-xl mb-4">{error}</div>
        <div className="text-neutral-400">
          Create a debug scene at:<br />
          <code className="text-green-400">lib/clown-club/debug/scenes/{game}DebugScene.ts</code>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Phase/Role Controls */}
      <div className="flex flex-wrap gap-2 justify-center">
        <div className="flex gap-1 bg-neutral-800 rounded-lg p-1">
          {phases.map((p) => (
            <button
              key={p}
              onClick={() => handlePhaseChange(p)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                currentPhase === p
                  ? 'bg-red-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-neutral-800 rounded-lg p-1">
          {['mc', 'guesser'].map((r) => (
            <button
              key={r}
              onClick={() => handleRoleChange(r)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                currentRole === r
                  ? 'bg-amber-500 text-black'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
            >
              {r === 'mc' ? 'Main Character' : 'Guesser'}
            </button>
          ))}
        </div>
      </div>

      {/* Game Container */}
      <div
        ref={containerRef}
        style={{
          width: viewportSize.width,
          height: viewportSize.height,
          border: '2px solid #333',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      />

      {/* Viewport Info */}
      <div className="text-center text-neutral-500 text-xs">
        {viewportSize.width} x {viewportSize.height}px ({viewport})
      </div>
    </div>
  );
}
