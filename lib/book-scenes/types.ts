export type EffectType = 'dust' | 'petals' | 'rain' | 'snow' | 'fireflies' | 'candleFlicker' | 'shootingStars' | 'mist' | 'waterDrips' | 'steam';

export interface EffectConfig {
  type: EffectType;
  config: {
    // Common properties
    density?: number;      // Number of particles
    speed?: number;        // Movement speed multiplier
    opacity?: number;      // Base opacity (0-1)
    color?: string;        // Particle color (hex) - for single color effects
    colors?: string[];     // Particle colors (hex array) - for multi-color effects like petals
    size?: number;         // Base particle size
    drift?: number;        // Horizontal drift amount
    rotation?: boolean;    // Whether particles rotate (for petals)
    // Shooting star properties
    frequency?: number;    // Spawn rate in ms
    trailLength?: number;  // Length of trail
    starColor?: string;    // Star core color
    trailColor?: string;   // Trail color
    glowColor?: string;    // Glow effect color
    maxStars?: number;     // Max concurrent stars
    minSize?: number;      // Min star size
    maxSize?: number;      // Max star size
    // Mist properties
    layers?: number;       // Depth layers for parallax
    // Water drips properties
    maxDrips?: number;     // Max concurrent drips
    // Steam properties
    sourceX?: number;      // X position (0-1, percentage)
    sourceY?: number;      // Y position (0-1, percentage)
    sourceWidth?: number;  // Width of emission area
    lifespan?: number;     // Particle lifespan (ms)
    turbulence?: number;   // Wispy movement strength
  };
}

export interface BookScene {
  id: string;
  name: string;
  description: string;
  image: string;           // Path to base image
  effects: EffectConfig[];
  audio?: string;          // Optional ambient audio path
  book?: {                 // Optional book reference for future
    title: string;
    author: string;
    location?: string;     // Location in book world
  };
}
