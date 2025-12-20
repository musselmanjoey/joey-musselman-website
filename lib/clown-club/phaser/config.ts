import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { LobbyScene } from './scenes/LobbyScene';
import { BoardGameScene } from './scenes/BoardGameScene';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  // Use window dimensions for mobile-friendly sizing
  const width = Math.min(window.innerWidth, 800);
  const height = Math.min(window.innerHeight, 600);

  return {
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: '#87CEEB', // Sky blue
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    scene: [BootScene, LobbyScene, BoardGameScene],
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    input: {
      activePointers: 3, // Support multi-touch
    },
  };
}
