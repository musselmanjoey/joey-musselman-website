/**
 * Multi-player browser test
 * Run: node scripts/test-multiplayer.mjs
 *
 * Ctrl+C closes all browsers cleanly
 */

import { chromium, devices } from 'playwright';

const URL = 'http://localhost:3000/clown-club';
const PLAYER_COUNT = 5;
const COLORS = ['garnet', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'white'];
const device = devices['iPhone 12 Pro'];

const browsers = [];

// Clean shutdown on Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n\nClosing all browsers...');
  await Promise.all(browsers.map(b => b.close().catch(() => {})));
  console.log('Done!');
  process.exit(0);
});

async function launchPlayers() {
  console.log(`Launching ${PLAYER_COUNT} browser windows...\n`);

  for (let i = 1; i <= PLAYER_COUNT; i++) {
    const browser = await chromium.launch({
      headless: false,
      args: [
        '--window-size=380,750',
        `--window-position=${-1920 + (i - 1) * 385},50`,  // Left monitor (negative X)
      ],
    });
    browsers.push(browser);

    const context = await browser.newContext({
      ...device,
      viewport: { width: 390, height: 700 },
    });

    const page = await context.newPage();

    console.log(`Player ${i}: Navigating...`);
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector('[data-testid="player-name-input"]', { timeout: 10000 });
    await page.getByTestId('player-name-input').fill(`Player${i}`);
    await page.getByTestId(`color-${COLORS[i - 1]}`).click();
    await page.getByTestId('enter-world-button').click();

    await page.waitForURL('**/world/**', { timeout: 15000 });
    console.log(`Player ${i}: Joined as ${COLORS[i - 1]}`);

    // Small delay between players
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n✓ All players in the world!');
  console.log('Press Ctrl+C to close all browsers\n');

  // Keep running
  await new Promise(() => {});
}

launchPlayers().catch(async (err) => {
  console.error(err);
  await Promise.all(browsers.map(b => b.close().catch(() => {})));
  process.exit(1);
});
