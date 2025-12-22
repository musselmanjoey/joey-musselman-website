'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { HostWorldScene } from './scenes/HostWorldScene';
import { HostBoardGameScene } from './scenes/HostBoardGameScene';
import { HostCaptionContestScene } from './scenes/HostCaptionContestScene';

interface HostPhaserWrapperProps {
  socket: Socket;
  gameActive: boolean;
  gameType?: string;
}

// Boot scene that waits for socket before starting world
class HostBootScene extends Phaser.Scene {
  constructor() {
    super('HostBootScene');
  }

  create() {
    // Show loading
    this.add.rectangle(640, 360, 1280, 720, 0xffffff);
    this.add.text(640, 360, '📺 Loading TV Display...', {
      fontSize: '32px',
      color: '#171717',
    }).setOrigin(0.5);

    // Wait for socket to be in registry
    const checkSocket = () => {
      const socket = this.registry.get('socket');
      if (socket) {
        console.log('[HostBoot] Socket ready, starting world');
        this.scene.start('HostWorldScene');
      } else {
        this.time.delayedCall(100, checkSocket);
      }
    };
    checkSocket();
  }
}

function createHostGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: '#ffffff',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [HostBootScene, HostWorldScene, HostBoardGameScene, HostCaptionContestScene],
  };
}

export function HostPhaserWrapper({ socket, gameActive, gameType }: HostPhaserWrapperProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config = createHostGameConfig('host-phaser-container');
    const game = new Phaser.Game(config);

    game.registry.set('socket', socket);
    game.registry.set('isSpectator', true);

    gameRef.current = game;

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [socket]);

  // Handle game active state changes
  useEffect(() => {
    if (!gameRef.current) return;

    const game = gameRef.current;

    if (gameActive) {
      // Switch to appropriate game scene based on type
      const sceneName = gameType === 'caption-contest' 
        ? 'HostCaptionContestScene' 
        : 'HostBoardGameScene';
      console.log(`[HostWrapper] Switching to ${sceneName}`);
      game.scene.start(sceneName);
    } else {
      // Return to world
      if (game.scene.isActive('HostBoardGameScene')) {
        game.scene.start('HostWorldScene');
      }
      if (game.scene.isActive('HostCaptionContestScene')) {
        game.scene.start('HostWorldScene');
      }
    }
  }, [gameActive, gameType]);

  return (
    <div
      ref={containerRef}
      id="host-phaser-container"
      className="w-full h-full"
    />
  );
}
