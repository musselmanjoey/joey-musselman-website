/**
 * Mock data for world/zone debug mode
 *
 * Provides mock world state for testing zone UIs without running the server.
 */

export interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  character: string;
  isVIP?: boolean;
}

export interface ObjectData {
  id: string;
  type: string;
  x: number;
  y: number;
  emoji: string;
  action?: string;
  label?: string;
}

export interface WorldMockData {
  zoneId: string;
  zoneName: string;
  players: PlayerData[];
  objects: ObjectData[];
  localPlayerId: string;
  overlayState?: 'none' | 'game-selector' | 'construction' | 'vinyl-browser' | 'dj-controls' | 'reviews';
  overlayMessage?: string;
}

// Mock players for different scenarios
const MOCK_PLAYERS: PlayerData[] = [
  { id: 'local-player', name: 'You', x: 400, y: 480, character: 'clown-1', isVIP: false },
  { id: 'player-2', name: 'Alice', x: 350, y: 450, character: 'clown-2', isVIP: true },
  { id: 'player-3', name: 'Bob', x: 450, y: 500, character: 'clown-3', isVIP: false },
  { id: 'player-4', name: 'Charlie', x: 500, y: 420, character: 'clown-4', isVIP: false },
];

// Zone configurations (matching server ZoneConfig.js)
const ZONE_OBJECTS: Record<string, ObjectData[]> = {
  lobby: [
    { id: 'door-cafe', type: 'door', x: 189, y: 315, emoji: '', action: 'under-construction', label: 'Cafe' },
    { id: 'door-records', type: 'door', x: 407, y: 300, emoji: '', action: 'zone-change', label: 'Records' },
    { id: 'door-arcade', type: 'door', x: 630, y: 322, emoji: '', action: 'zone-change', label: 'Arcade' },
  ],
  games: [
    { id: 'door-lobby', type: 'door', x: 92, y: 376, emoji: '', action: 'zone-change', label: 'Exit' },
    { id: 'arcade-caption', type: 'arcade', x: 249, y: 316, emoji: '', action: 'launch-game', label: 'Caption Contest' },
    { id: 'arcade-board', type: 'arcade', x: 356, y: 319, emoji: '', action: 'launch-game', label: 'Board Rush' },
    { id: 'arcade-about', type: 'arcade', x: 459, y: 319, emoji: '', action: 'launch-game', label: 'About You' },
    { id: 'arcade-newlywebs', type: 'arcade', x: 560, y: 316, emoji: '', action: 'under-construction', label: 'Newly Webs' },
    { id: 'stats-panel', type: 'info', x: 716, y: 261, emoji: '', action: 'under-construction', label: 'Leaderboard' },
  ],
  records: [
    { id: 'door-lobby', type: 'door', x: 92, y: 376, emoji: '', action: 'zone-change', label: 'Exit' },
    { id: 'vinyl-browser', type: 'vinyl', x: 300, y: 300, emoji: '', action: 'browse-vinyl', label: 'Browse Collection' },
    { id: 'dj-booth', type: 'dj', x: 550, y: 280, emoji: '', action: 'playback-controls', label: 'DJ Booth' },
    { id: 'review-board', type: 'info', x: 680, y: 350, emoji: '', action: 'view-reviews', label: 'Reviews' },
  ],
};

// Zone names
const ZONE_NAMES: Record<string, string> = {
  lobby: 'Town Square',
  games: 'Game Room',
  records: 'Record Store',
};

// World states for different scenarios
export type WorldScenario = 'default' | 'multiplayer' | 'empty' | 'game-selector' | 'construction' | 'vinyl-browser' | 'dj-controls' | 'reviews';

const WORLD_SCENARIOS: Record<string, Record<WorldScenario, Partial<WorldMockData>>> = {
  lobby: {
    default: {
      players: [MOCK_PLAYERS[0]],
      overlayState: 'none',
    },
    multiplayer: {
      players: MOCK_PLAYERS,
      overlayState: 'none',
    },
    empty: {
      players: [MOCK_PLAYERS[0]],
      overlayState: 'none',
    },
    'game-selector': {
      players: [MOCK_PLAYERS[0]],
      overlayState: 'game-selector',
    },
    construction: {
      players: [MOCK_PLAYERS[0]],
      overlayState: 'construction',
      overlayMessage: 'The Cafe is coming soon! ☕',
    },
    'vinyl-browser': { players: [MOCK_PLAYERS[0]], overlayState: 'none' },
    'dj-controls': { players: [MOCK_PLAYERS[0]], overlayState: 'none' },
    reviews: { players: [MOCK_PLAYERS[0]], overlayState: 'none' },
  },
  games: {
    default: {
      players: [{ ...MOCK_PLAYERS[0], x: 400, y: 500 }],
      overlayState: 'none',
    },
    multiplayer: {
      players: MOCK_PLAYERS.map((p, i) => ({ ...p, x: 300 + i * 80, y: 450 + (i % 2) * 50 })),
      overlayState: 'none',
    },
    empty: {
      players: [{ ...MOCK_PLAYERS[0], x: 400, y: 500 }],
      overlayState: 'none',
    },
    'game-selector': {
      players: [{ ...MOCK_PLAYERS[0], x: 400, y: 500 }],
      overlayState: 'game-selector',
    },
    construction: {
      players: [{ ...MOCK_PLAYERS[0], x: 400, y: 500 }],
      overlayState: 'construction',
      overlayMessage: 'Newly Webs is coming soon! 🕸️',
    },
    'vinyl-browser': { players: [MOCK_PLAYERS[0]], overlayState: 'none' },
    'dj-controls': { players: [MOCK_PLAYERS[0]], overlayState: 'none' },
    reviews: { players: [MOCK_PLAYERS[0]], overlayState: 'none' },
  },
  records: {
    default: {
      players: [{ ...MOCK_PLAYERS[0], x: 400, y: 480 }],
      overlayState: 'none',
    },
    multiplayer: {
      players: MOCK_PLAYERS.map((p, i) => ({ ...p, x: 300 + i * 80, y: 420 + (i % 2) * 50 })),
      overlayState: 'none',
    },
    empty: {
      players: [{ ...MOCK_PLAYERS[0], x: 400, y: 480 }],
      overlayState: 'none',
    },
    'game-selector': {
      players: [MOCK_PLAYERS[0]],
      overlayState: 'none',
    },
    construction: {
      players: [MOCK_PLAYERS[0]],
      overlayState: 'none',
    },
    'vinyl-browser': {
      players: [{ ...MOCK_PLAYERS[0], x: 300, y: 350 }],
      overlayState: 'vinyl-browser',
    },
    'dj-controls': {
      players: [{ ...MOCK_PLAYERS[0], x: 550, y: 350 }],
      overlayState: 'dj-controls',
    },
    reviews: {
      players: [{ ...MOCK_PLAYERS[0], x: 680, y: 400 }],
      overlayState: 'reviews',
    },
  },
};

// Available zones
export const ZONES = ['lobby', 'games', 'records'] as const;
export type ZoneId = typeof ZONES[number];

// Available scenarios
export const SCENARIOS: WorldScenario[] = ['default', 'multiplayer', 'empty', 'game-selector', 'construction', 'vinyl-browser', 'dj-controls', 'reviews'];

/**
 * Get mock world data for a specific zone and scenario
 */
export function getWorldMockData(zone: ZoneId, scenario: WorldScenario = 'default'): WorldMockData {
  const scenarioData = WORLD_SCENARIOS[zone]?.[scenario] || WORLD_SCENARIOS[zone]?.default || {};

  return {
    zoneId: zone,
    zoneName: ZONE_NAMES[zone] || zone,
    players: scenarioData.players || [MOCK_PLAYERS[0]],
    objects: ZONE_OBJECTS[zone] || [],
    localPlayerId: 'local-player',
    overlayState: scenarioData.overlayState || 'none',
    overlayMessage: scenarioData.overlayMessage,
  };
}

/**
 * Get zone-specific scenarios
 */
export function getZoneScenarios(zone: ZoneId): WorldScenario[] {
  const zoneData = WORLD_SCENARIOS[zone];
  if (!zoneData) return ['default'];

  return Object.keys(zoneData) as WorldScenario[];
}

export { MOCK_PLAYERS };
