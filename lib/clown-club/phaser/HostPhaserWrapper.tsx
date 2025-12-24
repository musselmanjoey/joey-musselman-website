'use client';

import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { HostWorldScene } from './scenes/HostWorldScene';
import { HostBoardGameScene } from './scenes/HostBoardGameScene';
import { HostCaptionContestScene } from './scenes/HostCaptionContestScene';
import { spriteConfigs, DIRECTION_4_TO_8, CLOWN_DIRECTION_ROWS } from './assets/AssetRegistry';
import { loadThemeConfig, getLobbyTheme, getArcadeTheme, preloadLobbyThemeAssets, preloadArcadeThemeAssets, LobbyTheme, ArcadeTheme, ThemeConfig } from './ThemeLoader';

interface HostPhaserWrapperProps {
  socket: Socket;
}

// Boot scene that loads assets and waits for socket before starting world
class HostBootScene extends Phaser.Scene {
  private themeConfig: ThemeConfig | null = null;
  private lobbyTheme: LobbyTheme | null = null;
  private arcadeTheme: ArcadeTheme | undefined = undefined;
  private themeAssetsLoaded: boolean = false;

  constructor() {
    super('HostBootScene');
  }

  async preload() {
    // Load all character spritesheets
    Object.values(spriteConfigs).forEach((config) => {
      this.load.spritesheet(config.key, config.path, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      });
    });

    // Load theme config and assets (same as regular BootScene)
    try {
      this.themeConfig = await loadThemeConfig();
      this.lobbyTheme = getLobbyTheme(this.themeConfig);
      this.arcadeTheme = getArcadeTheme(this.themeConfig);

      const hasUnifiedBg = this.lobbyTheme.mode === 'unified' && this.lobbyTheme.background;
      const hasLayeredBg = this.lobbyTheme.layers?.sky;

      if (hasUnifiedBg || hasLayeredBg) {
        preloadLobbyThemeAssets(this, this.lobbyTheme);
        this.themeAssetsLoaded = true;
      }

      // Load arcade theme assets
      if (this.arcadeTheme?.mode === 'unified' && this.arcadeTheme.background) {
        preloadArcadeThemeAssets(this, this.arcadeTheme);
      }
    } catch (err) {
      console.warn('[HostBoot] Failed to load theme config:', err);
    }
  }

  create() {
    // Store theme in registry for HostWorldScene to use
    this.registry.set('themeConfig', this.themeConfig);
    this.registry.set('lobbyTheme', this.lobbyTheme);
    this.registry.set('arcadeTheme', this.arcadeTheme);
    this.registry.set('themeAssetsLoaded', this.themeAssetsLoaded);

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

export function HostPhaserWrapper({ socket }: HostPhaserWrapperProps) {
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

  // Scene switching is now handled by HostWorldScene internally
  // via the "View Game" button

  return (
    <div
      ref={containerRef}
      id="host-phaser-container"
      className="w-full h-full"
    />
  );
}
