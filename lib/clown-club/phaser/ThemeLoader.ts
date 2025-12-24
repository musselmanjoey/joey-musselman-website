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

export interface Theme {
  name: string;
  layers: {
    sky: string;
    horizon: string;
    ground: string;
  };
  buildings: {
    left: ThemeBuilding;
    center: ThemeBuilding;
    right: ThemeBuilding;
  };
  props: ThemeProp[];
  effects?: ThemeEffects;
  colors?: ThemeColors;
}

export interface ThemeConfig {
  activeTheme: string;
  themes: Record<string, Theme>;
}

// Asset keys used in Phaser
export const THEME_ASSET_KEYS = {
  SKY: 'theme-sky',
  HORIZON: 'theme-horizon',
  GROUND: 'theme-ground',
  BUILDING_LEFT: 'theme-building-left',
  BUILDING_CENTER: 'theme-building-center',
  BUILDING_RIGHT: 'theme-building-right',
  PROP_PREFIX: 'theme-prop-',
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
 * Check if theme assets exist (for graceful fallback)
 */
export async function checkThemeAssetsExist(theme: Theme): Promise<boolean> {
  try {
    const skyResponse = await fetch(`/assets/themes/${theme.layers.sky}`, { method: 'HEAD' });
    return skyResponse.ok;
  } catch {
    return false;
  }
}

/**
 * Preload all theme assets in a Phaser scene
 */
export function preloadThemeAssets(scene: Phaser.Scene, theme: Theme): void {
  const basePath = '/assets/themes/';

  // Load layer images
  scene.load.image(THEME_ASSET_KEYS.SKY, basePath + theme.layers.sky);
  scene.load.image(THEME_ASSET_KEYS.HORIZON, basePath + theme.layers.horizon);
  scene.load.image(THEME_ASSET_KEYS.GROUND, basePath + theme.layers.ground);

  // Load building sprites
  scene.load.image(THEME_ASSET_KEYS.BUILDING_LEFT, basePath + theme.buildings.left.sprite);
  scene.load.image(THEME_ASSET_KEYS.BUILDING_CENTER, basePath + theme.buildings.center.sprite);
  scene.load.image(THEME_ASSET_KEYS.BUILDING_RIGHT, basePath + theme.buildings.right.sprite);

  // Load prop sprites (deduplicate by sprite path)
  const loadedProps = new Set<string>();
  theme.props.forEach((prop, index) => {
    if (!loadedProps.has(prop.sprite)) {
      scene.load.image(THEME_ASSET_KEYS.PROP_PREFIX + index, basePath + prop.sprite);
      loadedProps.add(prop.sprite);
    }
  });
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
  };
}
