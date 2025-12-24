/**
 * Shared world rendering utilities for player and host scenes.
 * Abstracts background creation, player rendering, and zone visuals
 * so changes only need to be made in one place.
 */

import * as Phaser from 'phaser';
import { LobbyTheme, ArcadeTheme, THEME_ASSET_KEYS } from './ThemeLoader';
import { characters } from './assets/AssetRegistry';

export interface WorldRendererConfig {
  width: number;
  height: number;
  /** Scale factor for positions (e.g., 1.6 for host display) */
  scaleX?: number;
  scaleY?: number;
}

export interface PlayerRenderData {
  id: string;
  name: string;
  x: number;
  y: number;
  character: string;
  isVIP?: boolean;
}

/**
 * Create lobby background using themed assets or procedural fallback
 */
export function createLobbyBackground(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  config: WorldRendererConfig,
  lobbyTheme?: LobbyTheme
): void {
  const { width, height } = config;
  const centerX = width / 2;
  const centerY = height / 2;

  // Try to use themed background first
  if (lobbyTheme?.mode === 'unified' && scene.textures.exists(THEME_ASSET_KEYS.BACKGROUND)) {
    const bg = scene.add.image(centerX, centerY, THEME_ASSET_KEYS.BACKGROUND);
    bg.setDisplaySize(width, height);
    container.add(bg);
    return;
  }

  // Layered mode with separate images
  if (scene.textures.exists(THEME_ASSET_KEYS.SKY)) {
    const sky = scene.add.image(centerX, height * 0.33, THEME_ASSET_KEYS.SKY);
    sky.setDisplaySize(width, height * 0.67);
    container.add(sky);
  }

  if (scene.textures.exists(THEME_ASSET_KEYS.HORIZON)) {
    const horizon = scene.add.image(centerX, height * 0.5, THEME_ASSET_KEYS.HORIZON);
    horizon.setDisplaySize(width, height * 0.33);
    container.add(horizon);
  }

  if (scene.textures.exists(THEME_ASSET_KEYS.GROUND)) {
    const ground = scene.add.image(centerX, height * 0.75, THEME_ASSET_KEYS.GROUND);
    ground.setDisplaySize(width, height * 0.5);
    container.add(ground);
  }

  // If no themed assets, fall back to procedural
  if (!scene.textures.exists(THEME_ASSET_KEYS.SKY) &&
      !scene.textures.exists(THEME_ASSET_KEYS.BACKGROUND)) {
    createProceduralLobbyBackground(scene, container, config);
  }

  // Add buildings if configured
  if (lobbyTheme?.buildings) {
    const scaleX = config.scaleX || 1;
    const scaleY = config.scaleY || 1;
    const buildings = lobbyTheme.buildings;

    if (scene.textures.exists(THEME_ASSET_KEYS.BUILDING_LEFT)) {
      const left = scene.add.image(
        buildings.left.x * scaleX,
        buildings.left.y * scaleY,
        THEME_ASSET_KEYS.BUILDING_LEFT
      );
      left.setOrigin(0.5, 1);
      if (scaleX !== 1 || scaleY !== 1) {
        left.setScale(Math.min(scaleX, scaleY));
      }
      container.add(left);

      const label = scene.add.text(
        buildings.left.x * scaleX,
        buildings.left.y * scaleY + 10,
        buildings.left.label,
        {
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#00000080',
          padding: { x: 6, y: 2 },
        }
      ).setOrigin(0.5);
      container.add(label);
    }

    if (scene.textures.exists(THEME_ASSET_KEYS.BUILDING_CENTER)) {
      const center = scene.add.image(
        buildings.center.x * scaleX,
        buildings.center.y * scaleY,
        THEME_ASSET_KEYS.BUILDING_CENTER
      );
      center.setOrigin(0.5, 1);
      if (scaleX !== 1 || scaleY !== 1) {
        center.setScale(Math.min(scaleX, scaleY));
      }
      container.add(center);

      const label = scene.add.text(
        buildings.center.x * scaleX,
        buildings.center.y * scaleY + 10,
        buildings.center.label,
        {
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#00000080',
          padding: { x: 6, y: 2 },
        }
      ).setOrigin(0.5);
      container.add(label);
    }

    if (scene.textures.exists(THEME_ASSET_KEYS.BUILDING_RIGHT)) {
      const right = scene.add.image(
        buildings.right.x * scaleX,
        buildings.right.y * scaleY,
        THEME_ASSET_KEYS.BUILDING_RIGHT
      );
      right.setOrigin(0.5, 1);
      if (scaleX !== 1 || scaleY !== 1) {
        right.setScale(Math.min(scaleX, scaleY));
      }
      container.add(right);

      const label = scene.add.text(
        buildings.right.x * scaleX,
        buildings.right.y * scaleY + 10,
        buildings.right.label,
        {
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#00000080',
          padding: { x: 6, y: 2 },
        }
      ).setOrigin(0.5);
      container.add(label);
    }
  }

  // Add props if configured
  if (lobbyTheme?.props) {
    const scaleX = config.scaleX || 1;
    const scaleY = config.scaleY || 1;

    lobbyTheme.props.forEach((prop, index) => {
      const key = THEME_ASSET_KEYS.PROP_PREFIX + index;
      if (scene.textures.exists(key)) {
        const propImg = scene.add.image(prop.x * scaleX, prop.y * scaleY, key);
        propImg.setOrigin(0.5, 1);
        if (scaleX !== 1 || scaleY !== 1) {
          propImg.setScale(Math.min(scaleX, scaleY));
        }
        container.add(propImg);
      }
    });
  }
}

/**
 * Procedural lobby background (fallback when no theme assets)
 */
function createProceduralLobbyBackground(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  config: WorldRendererConfig
): void {
  const { width, height } = config;

  // Sky gradient
  const skyGradient = scene.add.graphics();
  skyGradient.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xE0F4FF, 0xE0F4FF, 1);
  skyGradient.fillRect(0, 0, width, height * 0.6);
  container.add(skyGradient);

  // Mountains
  const mountains = scene.add.graphics();
  mountains.fillStyle(0x8B9DC3, 1);
  mountains.beginPath();
  mountains.moveTo(0, height * 0.5);
  for (let x = 0; x <= width; x += width / 6) {
    const peakHeight = height * 0.25 + Math.random() * height * 0.1;
    mountains.lineTo(x + width / 12, peakHeight);
    mountains.lineTo(x + width / 6, height * 0.5);
  }
  mountains.lineTo(width, height * 0.5);
  mountains.closePath();
  mountains.fill();
  container.add(mountains);

  // Second mountain layer
  const mountains2 = scene.add.graphics();
  mountains2.fillStyle(0x6B7AA1, 1);
  mountains2.beginPath();
  mountains2.moveTo(0, height * 0.55);
  for (let x = 0; x <= width; x += width / 5) {
    const peakHeight = height * 0.35 + Math.random() * height * 0.08;
    mountains2.lineTo(x + width / 10, peakHeight);
    mountains2.lineTo(x + width / 5, height * 0.55);
  }
  mountains2.lineTo(width, height * 0.55);
  mountains2.closePath();
  mountains2.fill();
  container.add(mountains2);

  // Snow ground
  const snowGround = scene.add.graphics();
  snowGround.fillStyle(0xF5F5F5, 1);
  snowGround.fillRect(0, height * 0.55, width, height * 0.45);
  container.add(snowGround);

  // Snow patches
  for (let i = 0; i < 5; i++) {
    const patch = scene.add.ellipse(
      Math.random() * width,
      height * 0.7 + Math.random() * height * 0.25,
      60 + Math.random() * 60,
      20 + Math.random() * 20,
      0xFFFFFF,
      0.7
    );
    container.add(patch);
  }

  // Ice patches
  container.add(scene.add.ellipse(width * 0.19, height * 0.97, 100, 40, 0xB8E0F0, 0.5));
  container.add(scene.add.ellipse(width * 0.75, height * 1.03, 120, 45, 0xB8E0F0, 0.4));
  container.add(scene.add.ellipse(width * 0.44, height * 1.08, 90, 30, 0xB8E0F0, 0.5));

  // Path (simple triangle shape - Phaser Graphics doesn't support bezier)
  const path = scene.add.graphics();
  path.fillStyle(0xD4C4A8, 0.6);
  path.beginPath();
  path.moveTo(width * 0.35, height);
  path.lineTo(width * 0.5, height * 0.67);
  path.lineTo(width * 0.65, height);
  path.closePath();
  path.fill();
  container.add(path);
}

/**
 * Create games room background using themed assets or procedural fallback
 */
export function createGamesRoomBackground(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  config: WorldRendererConfig,
  arcadeTheme?: ArcadeTheme
): void {
  const { width, height } = config;
  const centerX = width / 2;
  const centerY = height / 2;

  // Try to use themed background first
  if (arcadeTheme?.mode === 'unified' && scene.textures.exists(THEME_ASSET_KEYS.ARCADE_BACKGROUND)) {
    const bg = scene.add.image(centerX, centerY, THEME_ASSET_KEYS.ARCADE_BACKGROUND);
    bg.setDisplaySize(width, height);
    container.add(bg);
    return;
  }

  // Fall back to procedural arcade background
  createProceduralArcadeBackground(scene, container, config);
}

/**
 * Procedural arcade background (fallback when no theme assets)
 */
function createProceduralArcadeBackground(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  config: WorldRendererConfig
): void {
  const { width, height } = config;

  // Dark arcade room background
  const bg = scene.add.graphics();

  // Dark gradient floor
  bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
  bg.fillRect(0, 0, width, height);

  // Neon accent lines
  bg.lineStyle(3, 0xff00ff, 0.5);
  bg.lineBetween(0, height * 0.15, width, height * 0.15);
  bg.lineStyle(3, 0x00ffff, 0.5);
  bg.lineBetween(0, height * 0.85, width, height * 0.85);

  // Grid pattern on floor
  bg.lineStyle(1, 0x4a4a6a, 0.3);
  for (let x = 0; x < width; x += 50) {
    bg.lineBetween(x, height * 0.5, x, height);
  }
  for (let y = height * 0.5; y < height; y += 30) {
    bg.lineBetween(0, y, width, y);
  }

  container.add(bg);

  // Title
  const title = scene.add.text(width / 2, height * 0.07, '- ARCADE -', {
    fontSize: `${Math.floor(height * 0.05)}px`,
    color: '#ff00ff',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add(title);
}

/**
 * Resolve character string to sprite key
 * Handles both direct sprite keys (e.g., 'clown-white') and legacy emoji lookup
 */
export function resolveCharacterSpriteKey(character: string): string | null {
  // Direct sprite key
  if (character?.startsWith('clown-') || character === 'penguin-blue' || character === 'green-cap') {
    return character;
  }

  // Legacy: look up sprite key from emoji
  const charConfig = Object.entries(characters).find(
    ([, config]) => config.emoji === character
  );
  return charConfig?.[1].spriteKey || null;
}

/**
 * Get sprite scale for a given sprite key
 */
export function getSpriteScale(spriteKey: string, forHost: boolean = false): number {
  if (spriteKey.startsWith('clown-')) {
    return forHost ? 0.35 : 0.4; // 256 * 0.35 = ~90px for host, ~100px for player
  } else if (spriteKey === 'green-cap') {
    return forHost ? 2.5 : 3; // 18 * 2.5 = 45px for host, 54px for player
  }
  return 1;
}

/**
 * Get crown and name tag positions for a sprite
 */
export function getSpritePositions(spriteKey: string | null, forHost: boolean = false): { crownY: number; nameTagY: number } {
  if (spriteKey?.startsWith('clown-')) {
    return forHost
      ? { crownY: -50, nameTagY: 50 }
      : { crownY: -58, nameTagY: 58 };
  }
  return forHost
    ? { crownY: -35, nameTagY: 30 }
    : { crownY: -40, nameTagY: 35 };
}
