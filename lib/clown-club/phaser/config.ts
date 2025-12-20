import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { LobbyScene } from './scenes/LobbyScene';
import { BoardGameScene } from './scenes/BoardGameScene';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 800,
    height: 600,
    backgroundColor: '#87CEEB', // Sky blue
    scale: {
      mode: Phaser.Scale.ENVELOP, // Fill screen, may crop edges
      autoCenter: Phaser.Scale.CENTER_BOTH,
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
