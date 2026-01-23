import { BookScene } from './types';

export const scenes: BookScene[] = [
  {
    id: 'cozy-reading-nook',
    name: 'Cozy Reading Nook',
    description: 'Afternoon sunlight streams through a window, dust motes dancing in the warm golden light.',
    image: '/book-scenes/cozy-reading-nook.png',
    effects: [
      {
        type: 'dust',
        config: {
          density: 40,
          speed: 0.3,
          opacity: 0.6,
          color: '#FFE4B5',
          size: 3,
          drift: 0.5,
        },
      },
    ],
  },
  {
    id: 'spring-court-garden',
    name: 'Spring Court Garden',
    description: 'The rose gardens of Tamlin\'s manor, where flower petals drift on an eternal spring breeze.',
    image: '/book-scenes/spring-court-garden.png',
    effects: [
      {
        type: 'petals',
        config: {
          density: 20,
          speed: 0.6,
          opacity: 0.85,
          colors: ['#FFB7C5', '#FFFFFF', '#FFF0F5', '#E6E6FA'],  // Pink, white, lavender blush, light purple
          size: 8,
          drift: 2,
          rotation: true,
        },
      },
    ],
    book: {
      title: 'A Court of Thorns and Roses',
      author: 'Sarah J. Maas',
      location: 'Spring Court - Tamlin\'s Manor',
    },
  },
  {
    id: 'starfall-velaris',
    name: 'Starfall over Velaris',
    description: 'The annual migration of spirits streaks across the night sky above the City of Starlight.',
    image: '/book-scenes/starfall-velaris.png',
    effects: [
      {
        type: 'shootingStars',
        config: {
          frequency: 600,
          speed: 10,
          trailLength: 25,
          starColor: '#FFFFFF',
          trailColor: '#E6E6FA',
          glowColor: '#B8A9E8',
          maxStars: 6,
          minSize: 2,
          maxSize: 5,
        },
      },
    ],
    book: {
      title: 'A Court of Mist and Fury',
      author: 'Sarah J. Maas',
      location: 'Night Court - Velaris',
    },
  },
  {
    id: 'oakwald-forest',
    name: 'Oakwald Forest',
    description: 'Ancient misty woods of Terrasen, where light filters through towering pines and birches.',
    image: '/book-scenes/oakwald-forest.png',
    effects: [
      {
        type: 'mist',
        config: {
          density: 12,
          speed: 0.2,
          opacity: 0.12,
          color: '#E8E8E8',
          minSize: 150,
          maxSize: 350,
          layers: 3,
        },
      },
      {
        type: 'dust',
        config: {
          density: 25,
          speed: 0.15,
          opacity: 0.5,
          color: '#FFFACD',
          size: 2,
          drift: 0.3,
        },
      },
    ],
    book: {
      title: 'Empire of Storms',
      author: 'Sarah J. Maas',
      location: 'Terrasen - Oakwald Forest',
    },
  },
];

export function getScene(id: string): BookScene | undefined {
  return scenes.find((scene) => scene.id === id);
}

export function getAllScenes(): BookScene[] {
  return scenes;
}
