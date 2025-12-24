/**
 * Resize lobby theme assets to their target dimensions
 *
 * Usage: npx tsx scripts/resize-lobby-assets.ts
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const LOBBY_DIR = path.join(__dirname, '../public/assets/themes/default/lobby');

// Target dimensions for each asset type
const RESIZE_CONFIG: Record<string, { width: number; height: number }> = {
  'sky.png': { width: 800, height: 400 },
  'horizon.png': { width: 800, height: 200 },
  'ground.png': { width: 800, height: 300 },
  'building-cafe.png': { width: 150, height: 180 },
  'building-records.png': { width: 150, height: 180 },
  'building-arcade.png': { width: 150, height: 180 },
  'prop-info-stand.png': { width: 60, height: 80 },
  'prop-bench.png': { width: 80, height: 50 },
  'prop-tree.png': { width: 60, height: 100 },
  'prop-lamp.png': { width: 30, height: 90 },
};

async function resizeAssets() {
  // Create backup directory
  const backupDir = path.join(LOBBY_DIR, '../lobby-originals');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  for (const [filename, dimensions] of Object.entries(RESIZE_CONFIG)) {
    const inputPath = path.join(LOBBY_DIR, filename);
    const backupPath = path.join(backupDir, filename);

    if (!fs.existsSync(inputPath)) {
      console.log(`Skipping ${filename} - not found`);
      continue;
    }

    // Get current dimensions
    const metadata = await sharp(inputPath).metadata();
    console.log(`${filename}: ${metadata.width}x${metadata.height} -> ${dimensions.width}x${dimensions.height}`);

    // Backup original if not already backed up
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(inputPath, backupPath);
      console.log(`  Backed up original to ${backupPath}`);
    }

    // Resize and overwrite
    await sharp(inputPath)
      .resize(dimensions.width, dimensions.height, {
        fit: 'fill', // Stretch to exact dimensions
      })
      .toFile(inputPath + '.tmp');

    // Replace original with resized
    fs.renameSync(inputPath + '.tmp', inputPath);
    console.log(`  Resized!`);
  }

  console.log('\nDone! Run the screenshot script to verify.');
}

resizeAssets().catch(console.error);
