/**
 * Screenshot script for world debug mode
 *
 * Takes screenshots of all world zones and scenarios using the debug pages.
 * No game server needed - uses mock data.
 *
 * Prerequisites:
 * - joey-musselman-site running on port 3000
 *
 * Usage: npx tsx scripts/screenshot-world.ts [zone]
 * Examples:
 *   npx tsx scripts/screenshot-world.ts           # All zones
 *   npx tsx scripts/screenshot-world.ts lobby     # Just lobby
 *   npx tsx scripts/screenshot-world.ts records   # Just record store
 */

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ZONE = process.argv[2]; // Optional: specific zone

const VIEWPORTS = {
  desktop: { width: 800, height: 600 },
  mobile: { width: 375, height: 667 },
};

// Zone and scenario configurations
const ZONE_CONFIGS: Record<string, { scenarios: string[] }> = {
  lobby: {
    scenarios: ['default', 'multiplayer', 'game-selector', 'construction'],
  },
  games: {
    scenarios: ['default', 'multiplayer', 'game-selector', 'construction'],
  },
  records: {
    scenarios: ['default', 'multiplayer', 'vinyl-browser', 'dj-controls', 'reviews'],
  },
};

async function takeScreenshots() {
  const zones = ZONE ? [ZONE] : Object.keys(ZONE_CONFIGS);

  // Validate zone
  for (const zone of zones) {
    if (!ZONE_CONFIGS[zone]) {
      console.error(`Unknown zone: ${zone}`);
      console.log('Available zones:', Object.keys(ZONE_CONFIGS).join(', '));
      process.exit(1);
    }
  }

  const browser = await chromium.launch({ headless: true });

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, '../screenshots/debug/world');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('\n📸 Taking world zone screenshots');
  console.log(`📁 Output: ${screenshotsDir}\n`);

  let totalScreenshots = 0;

  try {
    for (const viewport of ['desktop', 'mobile'] as const) {
      const viewportConfig = VIEWPORTS[viewport];
      const context = await browser.newContext({ viewport: viewportConfig });
      const page = await context.newPage();

      const viewportDir = path.join(screenshotsDir, viewport);
      if (!fs.existsSync(viewportDir)) {
        fs.mkdirSync(viewportDir, { recursive: true });
      }

      console.log(`📐 Viewport: ${viewport} (${viewportConfig.width}x${viewportConfig.height})`);

      for (const zone of zones) {
        const config = ZONE_CONFIGS[zone];
        console.log(`\n  📍 Zone: ${zone}`);

        for (const scenario of config.scenarios) {
          const url = `http://localhost:3000/clown-club/debug/world?zone=${zone}&scenario=${scenario}&viewport=${viewport}`;

          process.stdout.write(`    ${scenario}...`);

          try {
            await page.goto(url);
            await page.waitForSelector('canvas', { timeout: 10000 });
            await page.waitForTimeout(1000); // Extra time for Phaser rendering

            const filename = `${zone}-${scenario}.png`;
            await page.screenshot({
              path: path.join(viewportDir, filename),
              clip: {
                x: 0,
                y: 56, // Skip the debug control bar
                width: viewportConfig.width,
                height: viewportConfig.height,
              },
            });

            console.log(' ✓');
            totalScreenshots++;
          } catch (err) {
            console.log(' ✗');
            console.error(`      Error: ${(err as Error).message}`);
          }
        }
      }

      await context.close();
    }

    console.log(`\n✅ Done! ${totalScreenshots} screenshots saved.`);
    console.log(`\nView at: ${screenshotsDir}`);

  } finally {
    await browser.close();
  }
}

takeScreenshots().catch((err) => {
  console.error('Screenshot failed:', err.message);
  process.exit(1);
});
