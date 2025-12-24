import * as Phaser from 'phaser';
import { spriteConfigs, DIRECTION_4_TO_8, CLOWN_DIRECTION_ROWS, TUTORIAL_DIRECTION_ROWS } from '../assets/AssetRegistry';
import { loadThemeConfig, getLobbyTheme, preloadLobbyThemeAssets, LobbyTheme, ThemeConfig } from '../ThemeLoader';

export class BootScene extends Phaser.Scene {
  private themeConfig: ThemeConfig | null = null;
  private lobbyTheme: LobbyTheme | null = null;
  private themeAssetsLoaded = false;

  constructor() {
    super('BootScene');
  }

  async preload() {
    // Show loading text
    const loadingText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'Loading...',
      { fontSize: '32px', color: '#000' }
    );
    loadingText.setOrigin(0.5);

    // Load all character spritesheets
    Object.values(spriteConfigs).forEach((config) => {
      this.load.spritesheet(config.key, config.path, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
      });
    });

    // Try to load theme config and assets
    try {
      this.themeConfig = await loadThemeConfig();
      this.lobbyTheme = getLobbyTheme(this.themeConfig);

      // Only preload theme assets if they have paths (not procedural fallback)
      const hasUnifiedBg = this.lobbyTheme.mode === 'unified' && this.lobbyTheme.background;
      const hasLayeredBg = this.lobbyTheme.layers?.sky;

      if (hasUnifiedBg || hasLayeredBg) {
        preloadLobbyThemeAssets(this, this.lobbyTheme);
        this.themeAssetsLoaded = true;
      }
    } catch (error) {
      console.warn('Theme loading failed, using procedural fallback:', error);
    }
  }

  create() {
    // Store theme info in registry for other scenes to access
    this.registry.set('themeConfig', this.themeConfig);
    this.registry.set('lobbyTheme', this.lobbyTheme);
    this.registry.set('themeAssetsLoaded', this.themeAssetsLoaded);

    // Create animations for each character spritesheet
    this.createCharacterAnimations();

    // Transition to lobby scene
    this.scene.start('LobbyScene');
  }

  private createCharacterAnimations() {
    Object.values(spriteConfigs).forEach((config) => {
      const { key, columns } = config;

      // Determine which direction mapping to use based on sprite type
      if (key === 'clown-spritesheet' || (key.startsWith('clown-') && key !== 'clown-white-old')) {
        // Clown spritesheets (all color variants): 3 columns, walk cycle varies by direction
        // Front/back rows: [idle, walk, walk-flip] → cycle [0, 1, 0, 2]
        // Side rows: [idle, walk, idle] → cycle [0, 1, 0, 1]
        this.createClownSpritesheetAnimations(key, columns);
      } else if (key === 'green-cap') {
        // Tutorial-style sprites: rows are directions (down, up, left, right), columns are walk cycle frames
        // Use walk cycle pattern [0, 1, 0, 2] like the tutorial
        this.createRowBasedAnimations(key, columns, TUTORIAL_DIRECTION_ROWS, [0, 1, 0, 2]);
      } else {
        // Penguin-style sprites: columns are directions (8-directional)
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

  private createClownSpritesheetAnimations(key: string, columns: number) {
    // Layout: 3 cols x 4 rows
    // Row 0 (down):  idle[0], walk[1], walk-flip[2]
    // Row 1 (right): idle[0], walk[1], idle[2]
    // Row 2 (left):  idle[0], walk[1], idle[2]
    // Row 3 (up):    idle[0], walk[1], walk-flip[2]

    const directions = ['down', 'right', 'left', 'up'];

    directions.forEach((dir, rowIndex) => {
      const startFrame = rowIndex * columns;

      // Idle animation (first frame)
      this.anims.create({
        key: `${key}-idle-${dir}`,
        frames: [{ key, frame: startFrame }],
        frameRate: 1,
      });

      // Walk animation - different cycle for front/back vs sides
      let walkCycle: number[];
      if (dir === 'down' || dir === 'up') {
        // Front/back: idle → walk → idle → walk-flip
        walkCycle = [0, 1, 0, 2];
      } else {
        // Sides: idle → walk → idle → walk (repeat pattern)
        walkCycle = [0, 1, 0, 1];
      }

      const walkFrames = walkCycle.map(offset => ({ key, frame: startFrame + offset }));

      this.anims.create({
        key: `${key}-walk-${dir}`,
        frames: walkFrames,
        frameRate: 8,
        repeat: -1,
      });
    });
  }

  private createRowBasedAnimations(
    key: string,
    columns: number,
    directionRows: Record<string, number>,
    walkCycle?: number[]
  ) {
    Object.entries(directionRows).forEach(([dirName, rowIndex]) => {
      const startFrame = rowIndex * columns;

      // Idle animation (first frame of the row)
      this.anims.create({
        key: `${key}-idle-${dirName}`,
        frames: [{ key, frame: startFrame }],
        frameRate: 1,
      });

      // Walk animation
      const walkFrames = [];
      if (walkCycle) {
        // Use specified walk cycle (e.g., [0, 1, 0, 2] for stand-left-stand-right pattern)
        for (const frameOffset of walkCycle) {
          walkFrames.push({ key, frame: startFrame + frameOffset });
        }
      } else {
        // Use all frames in the row sequentially
        for (let i = 0; i < columns; i++) {
          walkFrames.push({ key, frame: startFrame + i });
        }
      }

      this.anims.create({
        key: `${key}-walk-${dirName}`,
        frames: walkFrames,
        frameRate: 8,
        repeat: -1,
      });
    });
  }
}
