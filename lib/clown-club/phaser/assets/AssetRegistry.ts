/**
 * Asset Registry - Character sprites and animations
 *
 * Spritesheet format: 8 columns (directions), 3 rows (animation frames)
 * Directions: S, SW, W, NW, N, NE, E, SE (columns 0-7)
 * Frame size: 37x64 pixels
 */

export interface CharacterAsset {
  emoji: string;
  spriteKey: string | null;
  name: string;
}

export interface SpriteConfig {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
}

export interface ObjectAsset {
  emoji: string;
  spriteKey: string | null;
  interactive?: boolean;
  action?: string;
}

// Direction mapping for 8-directional sprites (column index)
// Trying counter-clockwise: S, SW, W, NW, N, NE, E, SE
export const DIRECTIONS = {
  south: 0,      // down (facing camera)
  southwest: 1,
  west: 2,       // left
  northwest: 3,
  north: 4,      // up (back view)
  northeast: 5,
  east: 6,       // right
  southeast: 7,
} as const;

// Simplified 4-direction mapping to 8-direction columns
export const DIRECTION_4_TO_8 = {
  down: DIRECTIONS.south,    // column 0
  left: DIRECTIONS.west,     // column 2
  up: DIRECTIONS.north,      // column 4
  right: DIRECTIONS.east,    // column 6
} as const;

// Sprite configurations for loading
export const spriteConfigs: Record<string, SpriteConfig> = {
  'penguin-blue': {
    key: 'penguin-blue',
    path: '/assets/characters/penguin-blue.png',
    frameWidth: 36,
    frameHeight: 52,
    columns: 8,
    rows: 3,
  },
  'clown-white': {
    key: 'clown-white',
    path: '/assets/characters/clown-white.png',
    frameWidth: 256,
    frameHeight: 256,
    columns: 4,
    rows: 4,
  },
  'green-cap': {
    key: 'green-cap',
    path: '/assets/characters/green-cap.png',
    frameWidth: 16,
    frameHeight: 18,
    columns: 3,
    rows: 4,
  },
};

// Direction to row mapping for clown sprites (rows = directions)
export const CLOWN_DIRECTION_ROWS: Record<string, number> = {
  down: 0,
  right: 1,
  left: 2,
  up: 3,
};

// Direction to row mapping for tutorial-style sprites (down, up, left, right)
export const TUTORIAL_DIRECTION_ROWS: Record<string, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
};

export const characters: Record<string, CharacterAsset> = {
  clown: { emoji: '🤡', spriteKey: 'clown-white', name: 'Clown' },
  penguin: { emoji: '🐧', spriteKey: 'penguin-blue', name: 'Penguin' },
  bear: { emoji: '🐻', spriteKey: null, name: 'Bear' },
  fox: { emoji: '🦊', spriteKey: null, name: 'Fox' },
  cat: { emoji: '🐱', spriteKey: null, name: 'Cat' },
  dog: { emoji: '🐶', spriteKey: null, name: 'Dog' },
  rabbit: { emoji: '🐰', spriteKey: null, name: 'Rabbit' },
  greencap: { emoji: '🧢', spriteKey: 'green-cap', name: 'Green Cap' },
};

export const objects: Record<string, ObjectAsset> = {
  door: { emoji: '🚪', spriteKey: null, interactive: true, action: 'zone-change' },
  arcade: { emoji: '🕹️', spriteKey: null, interactive: true, action: 'launch-game' },
  tree: { emoji: '🌲', spriteKey: null },
  snowman: { emoji: '⛄', spriteKey: null },
  igloo: { emoji: '🏠', spriteKey: null, interactive: true },
};

export const emotes: Record<string, string> = {
  wave: '👋',
  dance: '💃',
  laugh: '😂',
  heart: '❤️',
  thumbsup: '👍',
};

/**
 * Get character visual (emoji or sprite key)
 */
export function getCharacterEmoji(characterType: string): string {
  return characters[characterType]?.emoji || '❓';
}

/**
 * Get object visual (emoji or sprite key)
 */
export function getObjectEmoji(objectType: string): string {
  return objects[objectType]?.emoji || '❓';
}

/**
 * Check if character has sprite loaded
 */
export function hasCharacterSprite(characterType: string): boolean {
  return characters[characterType]?.spriteKey !== null;
}
