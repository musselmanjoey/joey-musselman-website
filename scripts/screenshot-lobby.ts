/**
 * Quick screenshot script for iterating on the lobby UI
 *
 * Usage: npx tsx scripts/screenshot-lobby.ts
 */

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function takeScreenshot() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
  });
  const page = await context.newPage();

  // Ensure screenshots directory exists
  const screenshotsDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Navigating to clown-club...');

  // Go to the clown club page
  await page.goto('http://localhost:3000/clown-club');

  // Wait for the name input and enter a test name
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  await page.fill('input[type="text"]', 'Test');

  // Click "Enter World" button
  console.log('Clicking Enter World...');
  await page.click('button:has-text("Enter World")');

  // Wait for navigation to the world page and canvas to appear
  console.log('Waiting for game to load...');
  await page.waitForURL('**/world/**', { timeout: 15000 });
  await page.waitForSelector('canvas', { timeout: 15000 });

  // Give extra time for assets to load and render
  console.log('Waiting for assets to render...');
  await page.waitForTimeout(4000);

  // Take screenshot
  const screenshotPath = path.join(screenshotsDir, 'lobby.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });

  console.log(`Screenshot saved to: ${screenshotPath}`);

  await browser.close();
}

takeScreenshot().catch((err) => {
  console.error('Screenshot failed:', err.message);
  process.exit(1);
});
