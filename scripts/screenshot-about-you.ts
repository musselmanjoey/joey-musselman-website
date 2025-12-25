/**
 * Screenshot script for About You game - captures mobile player view at different phases
 *
 * Prerequisites:
 * - clown-club server running on port 3015
 * - joey-musselman-site running on port 3000
 *
 * Usage: npx tsx scripts/screenshot-about-you.ts
 */

import { chromium, Browser, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const MOBILE_VIEWPORT = { width: 375, height: 667 }; // iPhone SE
const HOST_VIEWPORT = { width: 1280, height: 720 };

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: false }); // headless: false so we can see what's happening

  // Ensure screenshots directory exists
  const screenshotsDir = path.join(__dirname, '../screenshots/about-you');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  let hostPage: Page | null = null;
  let player1Page: Page | null = null;
  let player2Page: Page | null = null;

  try {
    // Create host context
    const hostContext = await browser.newContext({ viewport: HOST_VIEWPORT });
    hostPage = await hostContext.newPage();

    // Create mobile player contexts
    const player1Context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
    player1Page = await player1Context.newPage();

    const player2Context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
    player2Page = await player2Context.newPage();

    // 1. Open host view
    console.log('Opening host view...');
    await hostPage.goto('http://localhost:3000/clown-club/host');
    await hostPage.waitForSelector('canvas', { timeout: 15000 });
    await delay(2000);

    // 2. Join as Player 1
    console.log('Player 1 joining...');
    await player1Page.goto('http://localhost:3000/clown-club');
    await player1Page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await player1Page.fill('input[type="text"]', 'Alice');
    await player1Page.click('button:has-text("Enter World")');
    await player1Page.waitForURL('**/world/**', { timeout: 15000 });
    await player1Page.waitForSelector('canvas', { timeout: 15000 });
    await delay(2000);

    // 3. Join as Player 2
    console.log('Player 2 joining...');
    await player2Page.goto('http://localhost:3000/clown-club');
    await player2Page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await player2Page.fill('input[type="text"]', 'Bob');
    await player2Page.click('button:has-text("Enter World")');
    await player2Page.waitForURL('**/world/**', { timeout: 15000 });
    await player2Page.waitForSelector('canvas', { timeout: 15000 });
    await delay(2000);

    // Take initial lobby screenshot
    await player1Page.screenshot({
      path: path.join(screenshotsDir, '01-lobby.png'),
      fullPage: false
    });
    console.log('Saved: 01-lobby.png');

    // Now we need manual intervention to start the game
    // The user needs to:
    // 1. Click on the About You arcade cabinet from host view
    // 2. Select Main Character
    // 3. Start the game

    console.log('\n===========================================');
    console.log('MANUAL STEPS REQUIRED:');
    console.log('1. On HOST: Click Games Room door');
    console.log('2. On PLAYERS: Click Games Room door (or they auto-follow)');
    console.log('3. On HOST: Click About You cabinet');
    console.log('4. On PLAYERS: Click About You cabinet');
    console.log('5. On HOST: Select Alice as Main Character');
    console.log('6. On HOST: Click START GAME');
    console.log('');
    console.log('Press ENTER when in ANSWERING phase...');
    console.log('===========================================\n');

    // Wait for user input
    await waitForEnter();

    // Screenshot answering phase
    await player1Page.screenshot({
      path: path.join(screenshotsDir, '02-answering-mc.png'),
      fullPage: false
    });
    console.log('Saved: 02-answering-mc.png (Main Character view)');

    await player2Page.screenshot({
      path: path.join(screenshotsDir, '03-answering-guesser.png'),
      fullPage: false
    });
    console.log('Saved: 03-answering-guesser.png (Guesser view)');

    // Also take host screenshot
    await hostPage.screenshot({
      path: path.join(screenshotsDir, '02-answering-host.png'),
      fullPage: false
    });
    console.log('Saved: 02-answering-host.png');

    console.log('\nType answers and submit, then press ENTER when in REVEAL phase...');
    await waitForEnter();

    await player1Page.screenshot({
      path: path.join(screenshotsDir, '04-reveal-mc.png'),
      fullPage: false
    });
    console.log('Saved: 04-reveal-mc.png');

    await player2Page.screenshot({
      path: path.join(screenshotsDir, '05-reveal-guesser.png'),
      fullPage: false
    });
    console.log('Saved: 05-reveal-guesser.png');

    await hostPage.screenshot({
      path: path.join(screenshotsDir, '04-reveal-host.png'),
      fullPage: false
    });
    console.log('Saved: 04-reveal-host.png');

    console.log('\nClick CONFIRM & NEXT, then press ENTER when in ROUND SUMMARY...');
    await waitForEnter();

    await player1Page.screenshot({
      path: path.join(screenshotsDir, '06-summary.png'),
      fullPage: false
    });
    console.log('Saved: 06-summary.png');

    console.log('\n===========================================');
    console.log(`All screenshots saved to: ${screenshotsDir}`);
    console.log('===========================================');

  } finally {
    await browser.close();
  }
}

function waitForEnter(): Promise<void> {
  return new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
}

takeScreenshots().catch((err) => {
  console.error('Screenshot failed:', err.message);
  process.exit(1);
});
