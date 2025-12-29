'use client';

import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { getWorldMockData, getZoneScenarios, ZONES, ZoneId, WorldScenario, SCENARIOS } from './worldMockData';

interface WorldDebugWrapperProps {
  zone: ZoneId;
  scenario: WorldScenario;
  viewport: string;
}

// Viewport sizes
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 800, height: 600 },
  host: { width: 1280, height: 720 },
};

export default function WorldDebugWrapper({ zone, scenario, viewport }: WorldDebugWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [currentZone, setCurrentZone] = useState<ZoneId>(zone);
  const [currentScenario, setCurrentScenario] = useState<WorldScenario>(scenario);
  const [error, setError] = useState<string | null>(null);

  const viewportSize = VIEWPORTS[viewport as keyof typeof VIEWPORTS] || VIEWPORTS.desktop;
  const scenarios = getZoneScenarios(currentZone);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const initGame = async () => {
      try {
        // Dynamically import the debug scene for this zone
        const sceneModule = await import(`./scenes/${currentZone}DebugScene`);
        const DebugScene = sceneModule.default;

        // Get mock data for current state
        const mockData = getWorldMockData(currentZone, currentScenario);

        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          parent: containerRef.current!,
          width: viewportSize.width,
          height: viewportSize.height,
          backgroundColor: '#1a1a2e',
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
        gameRef.current.registry.set('zone', currentZone);
        gameRef.current.registry.set('scenario', currentScenario);
        gameRef.current.registry.set('viewport', viewport);

      } catch (err) {
        console.error('Failed to load debug scene:', err);
        setError(`No debug scene found for zone: ${currentZone}`);
      }
    };

    initGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [currentZone, viewport]);

  // Update scene when scenario changes (without recreating game)
  useEffect(() => {
    if (gameRef.current) {
      const sceneName = `${currentZone}DebugScene`;
      if (gameRef.current.scene.isActive(sceneName)) {
        const scene = gameRef.current.scene.getScene(sceneName);
        if (scene) {
          const mockData = getWorldMockData(currentZone, currentScenario);
          gameRef.current.registry.set('mockData', mockData);
          gameRef.current.registry.set('scenario', currentScenario);
          // Emit event to scene to update
          scene.events.emit('debug:update', { scenario: currentScenario, mockData });
        }
      }
    }
  }, [currentZone, currentScenario]);

  const handleZoneChange = (newZone: ZoneId) => {
    // Destroy current game
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    setCurrentZone(newZone);
    setCurrentScenario('default');
    setError(null);
    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('zone', newZone);
    url.searchParams.set('scenario', 'default');
    window.history.replaceState({}, '', url.toString());
  };

  const handleScenarioChange = (newScenario: WorldScenario) => {
    setCurrentScenario(newScenario);
    const url = new URL(window.location.href);
    url.searchParams.set('scenario', newScenario);
    window.history.replaceState({}, '', url.toString());
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-red-500 text-xl mb-4">{error}</div>
        <div className="text-neutral-400">
          Create a debug scene at:<br />
          <code className="text-green-400">lib/clown-club/debug/scenes/{currentZone}DebugScene.ts</code>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Zone Selector */}
      <div className="flex flex-wrap gap-2 justify-center">
        <div className="flex gap-1 bg-neutral-800 rounded-lg p-1">
          {ZONES.map((z) => (
            <button
              key={z}
              onClick={() => handleZoneChange(z)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                currentZone === z
                  ? 'bg-red-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
            >
              {z}
            </button>
          ))}
        </div>

        {/* Scenario Selector */}
        <div className="flex gap-1 bg-neutral-800 rounded-lg p-1">
          {SCENARIOS.filter(s => scenarios.includes(s)).map((s) => (
            <button
              key={s}
              onClick={() => handleScenarioChange(s)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                currentScenario === s
                  ? 'bg-amber-500 text-black'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
            >
              {s}
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
