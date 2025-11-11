import { test, expect } from '@playwright/test';

test.describe('Abducktion Game', () => {
  test('should create a room and display room code', async ({ page }) => {
    // Navigate to host page
    await page.goto('/abducktion/host');

    // Wait for room creation
    await page.waitForSelector('text=/[A-Z]{4}/', { timeout: 10000 });

    // Check that a 4-letter room code is displayed
    const roomCode = await page.textContent('text=/[A-Z]{4}/');
    expect(roomCode).toMatch(/^[A-Z]{4}$/);

    // Check that QR code is visible
    await expect(page.locator('svg')).toBeVisible();

    // Check that "Start Game" button is present but disabled (no players yet)
    const startButton = page.locator('button:has-text("Waiting for players")');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeDisabled();
  });

  test('should allow player to join room', async ({ page, context }) => {
    // Open host page first
    const hostPage = await context.newPage();
    await hostPage.goto('/abducktion/host');

    // Get room code
    await hostPage.waitForSelector('text=/[A-Z]{4}/', { timeout: 10000 });
    const roomCodeElement = hostPage.locator('text=/[A-Z]{4}/').first();
    const roomCode = (await roomCodeElement.textContent()) || '';

    // Open player page
    await page.goto('/abducktion/join');

    // Fill in room code and player name
    await page.fill('input#roomCode', roomCode);
    await page.fill('input#playerName', 'TestPlayer');

    // Click join button
    await page.click('button:has-text("Join Game")');

    // Wait for redirect to play page
    await page.waitForURL('**/abducktion/play', { timeout: 10000 });

    // Check that player sees waiting screen
    await expect(page.locator('text=Waiting for game to start')).toBeVisible();

    // Check host page shows the player
    await expect(hostPage.locator('text=TestPlayer')).toBeVisible();

    // Check that start button is now enabled
    const startButton = hostPage.locator('button:has-text("Start Game")');
    await expect(startButton).toBeEnabled();

    await hostPage.close();
  });

  test('should start game and display game board', async ({ page, context }) => {
    // Create host
    const hostPage = await context.newPage();
    await hostPage.goto('/abducktion/host');
    await hostPage.waitForSelector('text=/[A-Z]{4}/', { timeout: 10000 });
    const roomCode = (await hostPage.locator('text=/[A-Z]{4}/').first().textContent()) || '';

    // Join as player
    await page.goto('/abducktion/join');
    await page.fill('input#roomCode', roomCode);
    await page.fill('input#playerName', 'Player1');
    await page.click('button:has-text("Join Game")');
    await page.waitForURL('**/abducktion/play');

    // Host starts game
    await hostPage.click('button:has-text("Start Game")');

    // Player should see game board
    await expect(page.locator('text=Level 1')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Moves: 0')).toBeVisible();

    // Check for control buttons
    await expect(page.locator('button:has-text("↑")')).toBeVisible();
    await expect(page.locator('button:has-text("↓")')).toBeVisible();
    await expect(page.locator('button:has-text("←")')).toBeVisible();
    await expect(page.locator('button:has-text("→")')).toBeVisible();

    // Host should see player board
    await expect(hostPage.locator('text=Level 1')).toBeVisible();
    await expect(hostPage.locator('text=Player1')).toBeVisible();

    await hostPage.close();
  });

  test('should allow player to move and update board', async ({ page, context }) => {
    // Create host
    const hostPage = await context.newPage();
    await hostPage.goto('/abducktion/host');
    await hostPage.waitForSelector('text=/[A-Z]{4}/', { timeout: 10000 });
    const roomCode = (await hostPage.locator('text=/[A-Z]{4}/').first().textContent()) || '';

    // Join as player
    await page.goto('/abducktion/join');
    await page.fill('input#roomCode', roomCode);
    await page.fill('input#playerName', 'Player1');
    await page.click('button:has-text("Join Game")');
    await page.waitForURL('**/abducktion/play');

    // Start game
    await hostPage.click('button:has-text("Start Game")');
    await page.waitForSelector('text=Level 1', { timeout: 10000 });

    // Make a move
    await page.click('button:has-text("→")');

    // Check that move count increased
    await expect(page.locator('text=Moves: 1')).toBeVisible({ timeout: 5000 });

    // Make another move
    await page.click('button:has-text("↓")');
    await expect(page.locator('text=Moves: 2')).toBeVisible({ timeout: 5000 });

    await hostPage.close();
  });

  test('should handle multiple players', async ({ page, context }) => {
    // Create host
    const hostPage = await context.newPage();
    await hostPage.goto('/abducktion/host');
    await hostPage.waitForSelector('text=/[A-Z]{4}/', { timeout: 10000 });
    const roomCode = (await hostPage.locator('text=/[A-Z]{4}/').first().textContent()) || '';

    // Join as player 1
    const player1Page = await context.newPage();
    await player1Page.goto('/abducktion/join');
    await player1Page.fill('input#roomCode', roomCode);
    await player1Page.fill('input#playerName', 'Player1');
    await player1Page.click('button:has-text("Join Game")');
    await player1Page.waitForURL('**/abducktion/play');

    // Join as player 2
    await page.goto('/abducktion/join');
    await page.fill('input#roomCode', roomCode);
    await page.fill('input#playerName', 'Player2');
    await page.click('button:has-text("Join Game")');
    await page.waitForURL('**/abducktion/play');

    // Host should see both players
    await expect(hostPage.locator('text=Player1')).toBeVisible();
    await expect(hostPage.locator('text=Player2')).toBeVisible();
    await expect(hostPage.locator('text=Players (2)')).toBeVisible();

    // Start game
    await hostPage.click('button:has-text("Start Game")');

    // Both players should see game board
    await expect(player1Page.locator('text=Level 1')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Level 1')).toBeVisible({ timeout: 10000 });

    // Host should see both player boards
    await expect(hostPage.locator('text=Level 1')).toBeVisible();
    const playerNames = await hostPage.locator('.backdrop-blur-xl .text-xl').allTextContents();
    expect(playerNames.filter(name => name === 'Player1' || name === 'Player2')).toHaveLength(2);

    await hostPage.close();
    await player1Page.close();
  });

  test('should prevent duplicate player names', async ({ page, context }) => {
    // Create host
    const hostPage = await context.newPage();
    await hostPage.goto('/abducktion/host');
    await hostPage.waitForSelector('text=/[A-Z]{4}/', { timeout: 10000 });
    const roomCode = (await hostPage.locator('text=/[A-Z]{4}/').first().textContent()) || '';

    // Join as player 1
    const player1Page = await context.newPage();
    await player1Page.goto('/abducktion/join');
    await player1Page.fill('input#roomCode', roomCode);
    await player1Page.fill('input#playerName', 'DuplicateName');
    await player1Page.click('button:has-text("Join Game")');
    await player1Page.waitForURL('**/abducktion/play');

    // Try to join with same name
    await page.goto('/abducktion/join');
    await page.fill('input#roomCode', roomCode);
    await page.fill('input#playerName', 'DuplicateName');
    await page.click('button:has-text("Join Game")');

    // Should show error
    await expect(page.locator('text=Name already taken')).toBeVisible({ timeout: 5000 });

    await hostPage.close();
    await player1Page.close();
  });

  test('should handle invalid room code', async ({ page }) => {
    await page.goto('/abducktion/join');
    await page.fill('input#roomCode', 'XXXX');
    await page.fill('input#playerName', 'TestPlayer');
    await page.click('button:has-text("Join Game")');

    // Should show error
    await expect(page.locator('text=Room not found')).toBeVisible({ timeout: 5000 });
  });
});
