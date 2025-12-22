import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { LobbyScene } from './scenes/LobbyScene';
import { GamesRoomScene } from './scenes/GamesRoomScene';
import { BoardGameScene } from './scenes/BoardGameScene';
import { CaptionContestScene } from './scenes/CaptionContestScene';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: 800,
    height: 600,
    backgroundColor: '#ffffff', // White
    scale: {
      mode: Phaser.Scale.FIT, // Fit whole game, letterbox if needed
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, LobbyScene, GamesRoomScene, BoardGameScene, CaptionContestScene],
    dom: {
      createContainer: true, // Enable DOM elements for text input
    },
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
