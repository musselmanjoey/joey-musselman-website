'use client';

import { useState } from 'react';

type Direction = 'down' | 'up' | 'left' | 'right';

const DIRECTIONS: Direction[] = ['down', 'up', 'left', 'right'];

// Character sprite frame positions (3 columns, 4 rows)
// Row 0: down, Row 1: right, Row 2: left, Row 3: up
const DIRECTION_TO_ROW: Record<Direction, number> = {
  down: 0,
  right: 1,
  left: 2,
  up: 3,
};

const CROWN_TEXTURES: Record<Direction, string> = {
  down: '/assets/cosmetics/hats/crown-front-clean.png',
  up: '/assets/cosmetics/hats/crown-back-clean.png',
  left: '/assets/cosmetics/hats/crown-side-clean.png',
  right: '/assets/cosmetics/hats/crown-side-clean.png',
};

export default function CosmeticsDebugPage() {
  // Crown positioning - these map directly to Phaser setX/setY/setScale
  // NOTE: These should match the values in Player.ts for clown sprites
  // Player.ts uses -39 for clowns (initial -29 then adjusted by setY(-39))
  const [crownX, setCrownX] = useState(0);
  const [crownY, setCrownY] = useState(-39);
  const [crownScale, setCrownScale] = useState(0.3);
  const [sideOffsetX, setSideOffsetX] = useState(2);
  const [flipLeftCrown, setFlipLeftCrown] = useState(true);

  // Character
  const [characterScale] = useState(0.4); // Fixed to match game
  const [characterColor, setCharacterColor] = useState('white');
  const characterColors = ['white', 'blue', 'pink', 'green', 'yellow', 'purple', 'orange', 'garnet'];

  // Calculate crown position for each direction (matches Phaser logic exactly)
  const getCrownPosition = (direction: Direction) => {
    let x = crownX;
    let flipX = false;

    if (direction === 'left') {
      x = sideOffsetX;
      flipX = flipLeftCrown;
    } else if (direction === 'right') {
      x = -sideOffsetX;
      flipX = !flipLeftCrown;
    }

    return { x, y: crownY, flipX };
  };

  // Container size (Phaser game is 800x600, character is centered)
  const containerSize = 200;
  const charDisplaySize = 256 * characterScale; // ~102px

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Cosmetics Debug (Phaser Mode)</h1>
        <p className="text-neutral-400">Uses exact Phaser positioning - origin(0.5, 0.5) at center</p>
      </div>

      {/* Controls */}
      <div className="bg-neutral-800 rounded-lg p-6 mb-8 max-w-xl">
        <h2 className="font-bold mb-4">Crown Settings (Phaser coordinates)</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Crown X: {crownX}px
            </label>
            <input
              type="range"
              min="-30"
              max="30"
              value={crownX}
              onChange={(e) => setCrownX(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Crown Y: {crownY}px (negative = up)
            </label>
            <input
              type="range"
              min="-80"
              max="20"
              value={crownY}
              onChange={(e) => setCrownY(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Side Offset X: {sideOffsetX}px
            </label>
            <input
              type="range"
              min="-30"
              max="30"
              value={sideOffsetX}
              onChange={(e) => setSideOffsetX(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Crown Scale: {crownScale.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.2"
              max="1.5"
              step="0.05"
              value={crownScale}
              onChange={(e) => setCrownScale(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="block text-sm text-neutral-400">
              Flip Left Crown
            </label>
            <input
              type="checkbox"
              checked={flipLeftCrown}
              onChange={(e) => setFlipLeftCrown(e.target.checked)}
              className="w-5 h-5"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">Character Color</label>
            <select
              value={characterColor}
              onChange={(e) => setCharacterColor(e.target.value)}
              className="bg-neutral-700 rounded px-3 py-1"
            >
              {characterColors.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Output values for code */}
        <div className="mt-6 p-3 bg-neutral-900 rounded text-sm font-mono">
          <div className="text-neutral-400 mb-2">// Copy to Player.ts constructor:</div>
          <div className="text-green-400">this.crown = scene.add.image({crownX}, {crownY}, 'crown-front');</div>
          <div className="text-green-400">this.crown.setOrigin(0.5, 0.5);</div>
          <div className="text-green-400">this.crown.setScale({crownScale});</div>
          <div className="text-neutral-400 mt-2">// In updateCrownDirection:</div>
          <div className="text-green-400">const sideOffsetX = {sideOffsetX};</div>
          <div className="text-green-400">// flipLeftCrown: {flipLeftCrown.toString()}</div>
        </div>
      </div>

      {/* Preview Grid - All 4 directions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {DIRECTIONS.map((direction) => {
          const crownPos = getCrownPosition(direction);
          return (
            <div key={direction} className="text-center">
              <div className="text-sm text-neutral-400 mb-2 uppercase">{direction}</div>
              <div
                className="relative bg-neutral-800 rounded-lg mx-auto"
                style={{ width: containerSize, height: containerSize }}
              >
                {/* Center point marker */}
                <div
                  className="absolute w-2 h-2 bg-red-500 rounded-full"
                  style={{
                    left: containerSize / 2 - 4,
                    top: containerSize / 2 - 4,
                  }}
                />

                {/* Character sprite - centered in container */}
                <div
                  style={{
                    position: 'absolute',
                    left: containerSize / 2 - charDisplaySize / 2,
                    top: containerSize / 2 - charDisplaySize / 2,
                    width: charDisplaySize,
                    height: charDisplaySize,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={`/assets/characters/clown-${characterColor}.png`}
                    alt={`Clown ${direction}`}
                    style={{
                      position: 'absolute',
                      width: 256 * 3 * characterScale,
                      height: 256 * 4 * characterScale,
                      top: -DIRECTION_TO_ROW[direction] * 256 * characterScale,
                      left: 0,
                      imageRendering: 'pixelated',
                    }}
                  />
                </div>

                {/* Crown - positioned like Phaser with origin(0.5, 0.5) */}
                {/* In Phaser: crown at (x, y) means center of crown is at that position relative to container center */}
                <img
                  src={CROWN_TEXTURES[direction]}
                  alt="Crown"
                  style={{
                    position: 'absolute',
                    // Crown center is at (containerCenter + crownPos.x, containerCenter + crownPos.y)
                    // But we position top-left, so subtract half the scaled crown size
                    left: containerSize / 2 + crownPos.x,
                    top: containerSize / 2 + crownPos.y,
                    transform: `translate(-50%, -50%) scale(${crownScale}) ${crownPos.flipX ? 'scaleX(-1)' : ''}`,
                    imageRendering: 'pixelated',
                    zIndex: 10,
                  }}
                />
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                x:{crownPos.x} y:{crownPos.y} flip:{crownPos.flipX ? 'Y' : 'N'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Raw crown images for reference */}
      <div className="mt-12">
        <h2 className="font-bold mb-4">Raw Crown Assets (actual size)</h2>
        <div className="flex gap-8">
          {['front', 'back', 'side'].map((type) => (
            <div key={type} className="text-center">
              <div className="text-sm text-neutral-400 mb-2 capitalize">{type}</div>
              <div className="bg-neutral-800 p-4 rounded">
                <img
                  src={`/assets/cosmetics/hats/crown-${type}-clean.png`}
                  alt={`Crown ${type}`}
                  className="mx-auto"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
