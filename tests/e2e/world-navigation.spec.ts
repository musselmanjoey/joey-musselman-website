import { test, expect, ClownClubHelpers, ZONES, VIEWPORTS } from '../fixtures/clown-club';

/**
 * World Navigation Tests
 *
 * Tests for the Clown Club virtual world navigation system.
 * These tests require both the Next.js dev server and the clown-club game server running.
 *
 * To run:
 * 1. Start game server: cd clown-club && npm run dev
 * 2. Start Next.js: cd joey-musselman-site && npm run dev
 * 3. Run tests: npx playwright test tests/e2e/world-navigation.spec.ts
 */

test.describe('World Entry', () => {
  test('should show name input form on clown-club page', async ({ page }) => {
    await page.goto('/clown-club');
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('button:has-text("Enter World")')).toBeVisible();
  });

  test('should join world and show canvas', async ({ page }) => {
    const helpers = new ClownClubHelpers(page);
    await helpers.joinWorld('TestPlayer');

    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should spawn player in lobby zone', async ({ page }) => {
    const helpers = new ClownClubHelpers(page);
    await helpers.joinWorld('TestPlayer');

    // Canvas should be visible and game should have loaded
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Take screenshot for visual verification
    await page.screenshot({ path: 'screenshots/lobby-spawn.png' });
  });
});

test.describe('Zone Transitions', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new ClownClubHelpers(page);
    await helpers.joinWorld('TestPlayer');
  });

  test('should transition from lobby to games room via arcade door', async ({ page }) => {
    const helpers = new ClownClubHelpers(page);

    // Click the arcade door
    await helpers.clickObject('door-arcade', 'lobby');
    await helpers.waitForZoneTransition('games');

    // Take screenshot of games room
    await page.screenshot({ path: 'screenshots/games-room.png' });
  });

  test('should transition from lobby to record store via records door', async ({ page }) => {
    const helpers = new ClownClubHelpers(page);

    // Click the records door
    await helpers.clickObject('door-records', 'lobby');
    await helpers.waitForZoneTransition('records');

    // Take screenshot of record store
    await page.screenshot({ path: 'screenshots/record-store.png' });
  });

  test('should return to lobby from games room via exit door', async ({ page }) => {
    const helpers = new ClownClubHelpers(page);

    // Go to games room first
    await helpers.clickObject('door-arcade', 'lobby');
    await helpers.waitForZoneTransition('games');

    // Click exit door to return to lobby
    await helpers.clickObject('door-lobby', 'games');
    await helpers.waitForZoneTransition('lobby');

    await page.screenshot({ path: 'screenshots/lobby-return.png' });
  });

  test('should return to lobby from record store via exit door', async ({ page }) => {
    const helpers = new ClownClubHelpers(page);

    // Go to record store first
    await helpers.clickObject('door-records', 'lobby');
    await helpers.waitForZoneTransition('records');

    // Click exit door to return to lobby
    await helpers.clickObject('door-lobby', 'records');
    await helpers.waitForZoneTransition('lobby');

    await page.screenshot({ path: 'screenshots/lobby-from-records.png' });
  });
});

test.describe('Interactive Objects', () => {
  test.describe('Lobby Zone', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new ClownClubHelpers(page);
      await helpers.joinWorld('TestPlayer');
    });

    test('should show construction message when clicking cafe', async ({ page }) => {
      const helpers = new ClownClubHelpers(page);

      await helpers.clickObject('door-cafe', 'lobby');
      // Construction overlay should appear
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/cafe-construction.png' });
    });
  });

  test.describe('Games Room', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new ClownClubHelpers(page);
      await helpers.joinWorld('TestPlayer');
      await helpers.clickObject('door-arcade', 'lobby');
      await helpers.waitForZoneTransition('games');
    });

    test('should show game selector when clicking arcade cabinet', async ({ page }) => {
      const helpers = new ClownClubHelpers(page);

      await helpers.clickObject('arcade-caption', 'games');
      await helpers.waitForGameSelector();

      await page.screenshot({ path: 'screenshots/game-selector.png' });
    });
  });

  test.describe('Record Store', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new ClownClubHelpers(page);
      await helpers.joinWorld('TestPlayer');
      await helpers.clickObject('door-records', 'lobby');
      await helpers.waitForZoneTransition('records');
    });

    test('should trigger vinyl browser when clicking vinyl shelf', async ({ page }) => {
      const helpers = new ClownClubHelpers(page);

      await helpers.clickObject('vinyl-browser', 'records');
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'screenshots/vinyl-browser-trigger.png' });
    });

    test('should trigger DJ controls when clicking DJ booth', async ({ page }) => {
      const helpers = new ClownClubHelpers(page);

      await helpers.clickObject('dj-booth', 'records');
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'screenshots/dj-booth-trigger.png' });
    });

    test('should trigger reviews panel when clicking review board', async ({ page }) => {
      const helpers = new ClownClubHelpers(page);

      await helpers.clickObject('review-board', 'records');
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'screenshots/reviews-trigger.png' });
    });
  });
});

test.describe('Click-to-Move', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new ClownClubHelpers(page);
    await helpers.joinWorld('TestPlayer');
  });

  test('should move player when clicking empty space', async ({ page }) => {
    const helpers = new ClownClubHelpers(page);

    // Click in an empty area (center-bottom of lobby)
    await helpers.clickCanvas(400, 520);
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'screenshots/player-move.png' });
  });
});

test.describe('Mobile Viewport', () => {
  test.use({ viewport: VIEWPORTS.mobile });

  test('should display correctly on mobile viewport', async ({ page }) => {
    const helpers = new ClownClubHelpers(page);
    await helpers.joinWorld('MobilePlayer');

    await page.screenshot({ path: 'screenshots/mobile-lobby.png' });
  });

  test('should handle touch interactions for zone transitions', async ({ page }) => {
    const helpers = new ClownClubHelpers(page);
    await helpers.joinWorld('MobilePlayer');

    // Click arcade door
    await helpers.clickObject('door-arcade', 'lobby');
    await helpers.waitForZoneTransition('games');

    await page.screenshot({ path: 'screenshots/mobile-games-room.png' });
  });
});
