/**
 * Resize unified lobby assets
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const LOBBY_DIR = path.join(__dirname, '../public/assets/themes/default/lobby');

const RESIZE_CONFIG: Record<string, { width: number; height: number }> = {
  'background-full.png': { width: 800, height: 600 },
  'prop-info-stand.png': { width: 100, height: 120 },
};

async function resizeAssets() {
  for (const [filename, dimensions] of Object.entries(RESIZE_CONFIG)) {
    const inputPath = path.join(LOBBY_DIR, filename);

    if (!fs.existsSync(inputPath)) {
      console.log(`Skipping ${filename} - not found`);
      continue;
    }

    const metadata = await sharp(inputPath).metadata();
    console.log(`${filename}: ${metadata.width}x${metadata.height} -> ${dimensions.width}x${dimensions.height}`);

    await sharp(inputPath)
      .resize(dimensions.width, dimensions.height, { fit: 'fill' })
      .toFile(inputPath + '.tmp');

    fs.renameSync(inputPath + '.tmp', inputPath);
    console.log(`  Resized!`);
  }

  console.log('\nDone!');
}

resizeAssets().catch(console.error);
