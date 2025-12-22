'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { HostWorldScene } from './scenes/HostWorldScene';
import { HostBoardGameScene } from './scenes/HostBoardGameScene';
import { HostCaptionContestScene } from './scenes/HostCaptionContestScene';
import { spriteConfigs, DIRECTION_4_TO_8, CLOWN_DIRECTION_ROWS } from './assets/AssetRegistry';

interface HostPhaserWrapperProps {
  socket: Socket;
  gameActive: boolean;
  gameType?: string;
}

// Boot scene that loads assets and waits for socket before starting world
class HostBootScene extends Phaser.Scene {
  constructor() {
    super('HostBootScene');
  }

  preload() {
    // Load all character spritesheets
    Object.values(spriteConfigs).forEach((config) => {
      this.load.spritesheet(config.key, config.path, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      });
    });
  }

  create() {
    // Create character animations
    this.createCharacterAnimations();

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

  private createCharacterAnimations() {
    Object.values(spriteConfigs).forEach((config) => {
      const { key, columns } = config;

      if (key.startsWith('clown')) {
        // Clown sprites: rows are directions, columns are walk cycle frames
        Object.entries(CLOWN_DIRECTION_ROWS).forEach(([dirName, rowIndex]) => {
          const startFrame = rowIndex * columns;

          this.anims.create({
            key: `${key}-idle-${dirName}`,
            frames: [{ key, frame: startFrame }],
            frameRate: 1,
          });

          const walkFrames = [];
          for (let i = 0; i < columns; i++) {
            walkFrames.push({ key, frame: startFrame + i });
          }

          this.anims.create({
            key: `${key}-walk-${dirName}`,
            frames: walkFrames,
            frameRate: 8,
            repeat: -1,
          });
        });
      } else {
        // Penguin-style sprites
        Object.entries(DIRECTION_4_TO_8).forEach(([dirName, colIndex]) => {
          this.anims.create({
            key: `${key}-idle-${dirName}`,
            frames: [{ key, frame: colIndex }],
            frameRate: 1,
          });

          this.anims.create({
            key: `${key}-walk-${dirName}`,
            frames: [{ key, frame: colIndex }],
            frameRate: 1,
          });
        });
      }
    });
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
