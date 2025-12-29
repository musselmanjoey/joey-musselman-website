/**
 * ThemeLoader - Loads and manages theme assets for the world background
 *
 * Themes allow swapping the entire visual style of the world (e.g., default, halloween, summer)
 * Each theme has layers (sky, horizon, ground), buildings, and props defined in theme-config.json
 */

export interface ThemeBuilding {
  sprite: string;
  x: number;
  y: number;
  label: string;
  emoji: string;
}

export interface ThemeProp {
  sprite: string;
  x: number;
  y: number;
}

export interface ThemeEffects {
  snowfall?: boolean;
  leaves?: boolean;
  lighting?: 'day' | 'night' | 'sunset';
}

export interface ThemeColors {
  groundWalkable?: string;
  pathColor?: string;
}

export interface LobbyTheme {
  mode?: 'unified' | 'layered';
  // Unified mode - single background image
  background?: string;
  // Layered mode - separate layers
  layers?: {
    sky: string;
    horizon: string;
    ground: string;
  };
  buildings?: {
    left: ThemeBuilding;
    center: ThemeBuilding;
    right: ThemeBuilding;
  };
  props: ThemeProp[];
  effects?: ThemeEffects;
}

export interface ArcadeTheme {
  mode?: 'unified' | 'layered';
  background?: string;
  props?: ThemeProp[];
  effects?: ThemeEffects;
}

export interface RecordsTheme {
  mode?: 'unified' | 'layered';
  background?: string;
  props?: ThemeProp[];
  effects?: ThemeEffects;
}

export interface Theme {
  name: string;
  lobby: LobbyTheme;
  arcade?: ArcadeTheme;
  records?: RecordsTheme;
}

export interface ThemeConfig {
  activeTheme: string;
  themes: Record<string, Theme>;
}

// Asset keys used in Phaser
export const THEME_ASSET_KEYS = {
  BACKGROUND: 'theme-background',
  SKY: 'theme-sky',
  HORIZON: 'theme-horizon',
  GROUND: 'theme-ground',
  BUILDING_LEFT: 'theme-building-left',
  BUILDING_CENTER: 'theme-building-center',
  BUILDING_RIGHT: 'theme-building-right',
  PROP_PREFIX: 'theme-prop-',
  // Arcade
  ARCADE_BACKGROUND: 'theme-arcade-background',
  ARCADE_PROP_PREFIX: 'theme-arcade-prop-',
  // Records
  RECORDS_BACKGROUND: 'theme-records-background',
  RECORDS_PROP_PREFIX: 'theme-records-prop-',
} as const;

/**
 * Load theme config from JSON file
 */
export async function loadThemeConfig(): Promise<ThemeConfig> {
  const response = await fetch('/assets/themes/theme-config.json');
  if (!response.ok) {
    console.warn('Could not load theme config, using fallback');
    return getFallbackConfig();
  }
  return response.json();
}

/**
 * Get the active theme from config
 */
export function getActiveTheme(config: ThemeConfig): Theme {
  return config.themes[config.activeTheme] || config.themes['default'];
}

/**
 * Get the lobby theme from the active theme
 */
export function getLobbyTheme(config: ThemeConfig): LobbyTheme {
  const theme = getActiveTheme(config);
  return theme.lobby;
}

/**
 * Check if lobby theme assets exist (for graceful fallback)
 */
export async function checkLobbyAssetsExist(lobbyTheme: LobbyTheme): Promise<boolean> {
  try {
    // Check unified background or layered sky
    const assetPath = lobbyTheme.background || lobbyTheme.layers?.sky;
    if (!assetPath) return false;
    const response = await fetch(`/assets/themes/${assetPath}`, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Preload lobby theme assets in a Phaser scene
 */
export function preloadLobbyThemeAssets(scene: Phaser.Scene, lobbyTheme: LobbyTheme): void {
  const basePath = '/assets/themes/';

  if (lobbyTheme.mode === 'unified' && lobbyTheme.background) {
    // Unified mode - single background image
    scene.load.image(THEME_ASSET_KEYS.BACKGROUND, basePath + lobbyTheme.background);
  } else if (lobbyTheme.layers) {
    // Layered mode - separate layers
    scene.load.image(THEME_ASSET_KEYS.SKY, basePath + lobbyTheme.layers.sky);
    scene.load.image(THEME_ASSET_KEYS.HORIZON, basePath + lobbyTheme.layers.horizon);
    scene.load.image(THEME_ASSET_KEYS.GROUND, basePath + lobbyTheme.layers.ground);

    // Load building sprites
    if (lobbyTheme.buildings) {
      scene.load.image(THEME_ASSET_KEYS.BUILDING_LEFT, basePath + lobbyTheme.buildings.left.sprite);
      scene.load.image(THEME_ASSET_KEYS.BUILDING_CENTER, basePath + lobbyTheme.buildings.center.sprite);
      scene.load.image(THEME_ASSET_KEYS.BUILDING_RIGHT, basePath + lobbyTheme.buildings.right.sprite);
    }
  }

  // Load prop sprites (both modes)
  const loadedProps = new Set<string>();
  lobbyTheme.props.forEach((prop, index) => {
    if (!loadedProps.has(prop.sprite)) {
      scene.load.image(THEME_ASSET_KEYS.PROP_PREFIX + index, basePath + prop.sprite);
      loadedProps.add(prop.sprite);
    }
  });
}

// Legacy alias for backwards compatibility
export const preloadThemeAssets = preloadLobbyThemeAssets;

/**
 * Get the arcade theme from config
 */
export function getArcadeTheme(config: ThemeConfig): ArcadeTheme | undefined {
  const theme = getActiveTheme(config);
  return theme.arcade;
}

/**
 * Preload arcade theme assets in a Phaser scene
 */
export function preloadArcadeThemeAssets(scene: Phaser.Scene, arcadeTheme: ArcadeTheme): void {
  const basePath = '/assets/themes/';

  if (arcadeTheme.mode === 'unified' && arcadeTheme.background) {
    scene.load.image(THEME_ASSET_KEYS.ARCADE_BACKGROUND, basePath + arcadeTheme.background);
  }

  // Load prop sprites if any
  if (arcadeTheme.props) {
    arcadeTheme.props.forEach((prop, index) => {
      scene.load.image(THEME_ASSET_KEYS.ARCADE_PROP_PREFIX + index, basePath + prop.sprite);
    });
  }
}

/**
 * Get the records store theme from config
 */
export function getRecordsTheme(config: ThemeConfig): RecordsTheme | undefined {
  const theme = getActiveTheme(config);
  return theme.records;
}

/**
 * Preload records store theme assets in a Phaser scene
 */
export function preloadRecordsThemeAssets(scene: Phaser.Scene, recordsTheme: RecordsTheme): void {
  const basePath = '/assets/themes/';

  if (recordsTheme.mode === 'unified' && recordsTheme.background) {
    scene.load.image(THEME_ASSET_KEYS.RECORDS_BACKGROUND, basePath + recordsTheme.background);
  }

  // Load prop sprites if any
  if (recordsTheme.props) {
    recordsTheme.props.forEach((prop, index) => {
      scene.load.image(THEME_ASSET_KEYS.RECORDS_PROP_PREFIX + index, basePath + prop.sprite);
    });
  }
}

/**
 * Fallback config when theme-config.json doesn't exist or can't be loaded
 * Returns a config that signals to use procedural drawing
 */
function getFallbackConfig(): ThemeConfig {
  return {
    activeTheme: 'procedural',
    themes: {
      procedural: {
        name: 'Procedural (Fallback)',
        lobby: {
          layers: { sky: '', horizon: '', ground: '' },
          buildings: {
            left: { sprite: '', x: 80, y: 280, label: 'Cafe', emoji: '☕' },
            center: { sprite: '', x: 400, y: 260, label: 'Shop', emoji: '🎁' },
            right: { sprite: '', x: 700, y: 280, label: 'Club', emoji: '🎵' },
          },
          props: [],
          effects: { snowfall: true, lighting: 'day' },
        },
      },
    },
  };
}
