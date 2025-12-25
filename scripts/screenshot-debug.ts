/**
 * Screenshot script for debug mode
 *
 * Takes screenshots of all game phases using the debug pages.
 * No game server needed - uses mock data.
 *
 * Prerequisites:
 * - joey-musselman-site running on port 3000
 *
 * Usage: npx tsx scripts/screenshot-debug.ts [game-name]
 * Example: npx tsx scripts/screenshot-debug.ts about-you
 */

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const GAME = process.argv[2] || 'about-you';

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  host: { width: 1280, height: 720 },
};

// Define phases and roles for each game
const GAME_CONFIGS: Record<string, { phases: string[]; roles: string[] }> = {
  'about-you': {
    phases: ['lobby', 'answering', 'answering-mc', 'reveal', 'round-summary', 'game-over'],
    roles: ['mc', 'guesser'],
  },
  // Add more games here
};

async function takeScreenshots() {
  const config = GAME_CONFIGS[GAME];
  if (!config) {
    console.error(`Unknown game: ${GAME}`);
    console.log('Available games:', Object.keys(GAME_CONFIGS).join(', '));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, `../screenshots/debug/${GAME}`);
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log(`\n📸 Taking screenshots for: ${GAME}`);
  console.log(`📁 Output: ${screenshotsDir}\n`);

  try {
    // Mobile screenshots (main focus)
    const mobileContext = await browser.newContext({ viewport: VIEWPORTS.mobile });
    const mobilePage = await mobileContext.newPage();

    for (const phase of config.phases) {
      for (const role of config.roles) {
        const url = `http://localhost:3000/clown-club/debug/${GAME}?phase=${phase}&role=${role}&viewport=mobile`;

        console.log(`  ${phase} (${role})...`);

        await mobilePage.goto(url);
        // Wait for Phaser to render
        await mobilePage.waitForSelector('canvas', { timeout: 10000 });
        await mobilePage.waitForTimeout(500); // Extra time for rendering

        const filename = `${phase}-${role}.png`;
        await mobilePage.screenshot({
          path: path.join(screenshotsDir, filename),
          clip: {
            x: 0,
            y: 56, // Skip the debug control bar
            width: VIEWPORTS.mobile.width,
            height: VIEWPORTS.mobile.height,
          },
        });
      }
    }

    await mobileContext.close();

    console.log(`\n✅ Done! ${config.phases.length * config.roles.length} screenshots saved.`);
    console.log(`\nView at: ${screenshotsDir}`);

  } finally {
    await browser.close();
  }
}

takeScreenshots().catch((err) => {
  console.error('Screenshot failed:', err.message);
  process.exit(1);
});
