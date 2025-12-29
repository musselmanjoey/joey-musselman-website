import * as Phaser from 'phaser';
import { WorldMockData, PlayerData } from '../worldMockData';

/**
 * Games Room Debug Scene - Renders the Arcade without server connection
 *
 * Uses mock data to display players, arcade cabinets, and overlays for testing.
 */

const COLORS = {
  wall: 0x2d2d44,
  floor: 0x3d3d5c,
  carpet: 0x9b59b6,
  arcade: 0x1a1a2e,
  screen: 0x00ff00,
  neon: 0xff00ff,
};

export default class GamesDebugScene extends Phaser.Scene {
  private mockData!: WorldMockData;
  private playerSprites: Phaser.GameObjects.Container[] = [];
  private overlayContainer?: Phaser.GameObjects.Container;

  constructor() {
    super('gamesDebugScene');
  }

  create() {
    this.mockData = this.registry.get('mockData') || { zoneId: 'games', zoneName: 'Game Room', players: [], objects: [], localPlayerId: '' };

    this.createBackground();
    this.renderPlayers();
    this.renderOverlay();

    this.events.on('debug:update', this.handleDebugUpdate, this);
  }

  private handleDebugUpdate(data: { scenario: string; mockData: WorldMockData }) {
    this.mockData = data.mockData;
    this.clearPlayers();
    this.renderPlayers();
    this.renderOverlay();
  }

  private createBackground() {
    const width = 800;
    const height = 600;

    // Dark arcade walls
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.wall).setDepth(-100);

    // Checkered floor
    const floorGraphics = this.add.graphics();
    floorGraphics.setDepth(-90);
    for (let x = 0; x < width; x += 40) {
      for (let y = 350; y < height; y += 40) {
        const isLight = ((x / 40) + (y / 40)) % 2 === 0;
        floorGraphics.fillStyle(isLight ? 0x4a4a6a : 0x3a3a5a, 1);
        floorGraphics.fillRect(x, y, 40, 40);
      }
    }

    // Purple carpet runner
    this.add.rectangle(width / 2, 500, 400, 180, COLORS.carpet, 0.3).setDepth(-85);

    // Arcade cabinets
    this.createArcadeCabinet(180, 280, '📸', 'Caption\nContest', 0xff6b6b);
    this.createArcadeCabinet(320, 280, '🎮', 'Board\nRush', 0x4ecdc4);
    this.createArcadeCabinet(460, 280, '🎭', 'About\nYou', 0xfbbf24);
    this.createArcadeCabinet(600, 280, '🕸️', 'Newly\nWebs', 0x9b59b6);

    // Leaderboard panel
    this.createLeaderboardPanel(720, 280);

    // Exit door
    this.createExitDoor(80, 350);

    // Neon decorations
    this.createNeonSign(width / 2, 80, 'ARCADE');

    // Ambient lighting
    this.createAmbientLighting();
  }

  private createArcadeCabinet(x: number, y: number, emoji: string, label: string, accentColor: number) {
    const container = this.add.container(x, y);
    container.setDepth(-50);

    // Cabinet body
    const body = this.add.rectangle(0, 0, 80, 140, COLORS.arcade);
    body.setStrokeStyle(2, accentColor);
    container.add(body);

    // Screen
    const screen = this.add.rectangle(0, -30, 60, 50, 0x000000);
    screen.setStrokeStyle(2, COLORS.screen);
    container.add(screen);

    // Screen glow
    const glow = this.add.rectangle(0, -30, 55, 45, accentColor, 0.3);
    container.add(glow);

    // Game emoji
    const gameEmoji = this.add.text(0, -30, emoji, { fontSize: '28px' }).setOrigin(0.5);
    container.add(gameEmoji);

    // Control panel
    const controls = this.add.rectangle(0, 20, 60, 25, 0x2d2d44);
    container.add(controls);

    // Buttons
    const btn1 = this.add.circle(-15, 20, 6, 0xff0000);
    const btn2 = this.add.circle(0, 20, 6, 0x00ff00);
    const btn3 = this.add.circle(15, 20, 6, 0x0000ff);
    container.add([btn1, btn2, btn3]);

    // Label
    const labelText = this.add.text(0, 80, label, {
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);
    container.add(labelText);
  }

  private createLeaderboardPanel(x: number, y: number) {
    const container = this.add.container(x, y);
    container.setDepth(-50);

    // Panel background
    const panel = this.add.rectangle(0, 0, 80, 120, 0x1a1a2e);
    panel.setStrokeStyle(2, 0xfbbf24);
    container.add(panel);

    // Title
    const title = this.add.text(0, -45, '🏆', { fontSize: '24px' }).setOrigin(0.5);
    container.add(title);

    // Mock leaderboard entries
    const entries = ['1. Alice', '2. Bob', '3. Carol'];
    entries.forEach((entry, i) => {
      const text = this.add.text(0, -15 + i * 20, entry, {
        fontSize: '10px',
        color: '#ffffff',
      }).setOrigin(0.5);
      container.add(text);
    });

    // Label
    const label = this.add.text(0, 70, 'SCORES', {
      fontSize: '11px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(label);
  }

  private createExitDoor(x: number, y: number) {
    const container = this.add.container(x, y);
    container.setDepth(-60);

    // Door frame
    const frame = this.add.rectangle(0, 0, 60, 100, 0x4a3728);
    container.add(frame);

    // Door
    const door = this.add.rectangle(0, 0, 50, 90, 0x654321);
    container.add(door);

    // Exit sign
    const sign = this.add.rectangle(0, -60, 50, 20, 0x22c55e);
    container.add(sign);

    const signText = this.add.text(0, -60, 'EXIT', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(signText);

    // Arrow
    const arrow = this.add.text(-20, -60, '←', {
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(arrow);
  }

  private createNeonSign(x: number, y: number, text: string) {
    // Glow effect
    const glow = this.add.text(x, y, text, {
      fontSize: '48px',
      color: '#ff00ff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.5);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(-30);

    // Main text
    const mainText = this.add.text(x, y, text, {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    mainText.setDepth(-29);
  }

  private createAmbientLighting() {
    const lighting = this.add.graphics();
    lighting.setDepth(-70);

    // Spotlight effects from arcade screens
    const positions = [180, 320, 460, 600];
    const colors = [0xff6b6b, 0x4ecdc4, 0xfbbf24, 0x9b59b6];

    positions.forEach((x, i) => {
      lighting.fillStyle(colors[i], 0.1);
      lighting.fillCircle(x, 280, 80);
    });
  }

  private clearPlayers() {
    this.playerSprites.forEach(sprite => sprite.destroy());
    this.playerSprites = [];
  }

  private renderPlayers() {
    for (const player of this.mockData.players) {
      const container = this.createPlayerSprite(player);
      this.playerSprites.push(container);
    }
  }

  private createPlayerSprite(player: PlayerData): Phaser.GameObjects.Container {
    const container = this.add.container(player.x, player.y);
    container.setDepth(player.y);

    // Shadow
    const shadow = this.add.ellipse(0, 20, 40, 15, 0x000000, 0.3);
    container.add(shadow);

    // Body
    const body = this.add.circle(0, 0, 25, player.id === this.mockData.localPlayerId ? 0xdc2626 : 0x4ecdc4);
    body.setStrokeStyle(3, 0xffffff);
    container.add(body);

    // Clown emoji
    const emoji = this.add.text(0, -5, '🤡', { fontSize: '24px' }).setOrigin(0.5);
    container.add(emoji);

    // Name tag
    const nameTag = this.add.text(0, -45, player.name, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: player.isVIP ? '#fbbf24' : '#000000cc',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);
    container.add(nameTag);

    if (player.isVIP) {
      const crown = this.add.text(0, -65, '👑', { fontSize: '16px' }).setOrigin(0.5);
      container.add(crown);
    }

    return container;
  }

  private renderOverlay() {
    if (this.overlayContainer) {
      this.overlayContainer.destroy();
      this.overlayContainer = undefined;
    }

    if (!this.mockData.overlayState || this.mockData.overlayState === 'none') {
      return;
    }

    if (this.mockData.overlayState === 'game-selector') {
      this.showGameSelectorOverlay();
    } else if (this.mockData.overlayState === 'construction') {
      this.showConstructionOverlay(this.mockData.overlayMessage || 'Coming soon!');
    }
  }

  private showGameSelectorOverlay() {
    this.overlayContainer = this.add.container(400, 300);
    this.overlayContainer.setDepth(1000);

    const bg = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.85);
    this.overlayContainer.add(bg);

    const title = this.add.text(0, -120, '🕹️ SELECT A GAME', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlayContainer.add(title);

    const games = [
      { emoji: '🎮', name: 'Board Rush', x: -100 },
      { emoji: '📸', name: 'Caption Contest', x: 100 },
    ];

    games.forEach(game => {
      const gameBg = this.add.rectangle(game.x, 20, 150, 150, 0xf3f4f6);
      gameBg.setStrokeStyle(3, 0xdc2626);
      this.overlayContainer!.add(gameBg);

      const gameEmoji = this.add.text(game.x, 0, game.emoji, { fontSize: '64px' }).setOrigin(0.5);
      this.overlayContainer!.add(gameEmoji);

      const gameLabel = this.add.text(game.x, 60, game.name, {
        fontSize: '16px',
        color: '#171717',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.overlayContainer!.add(gameLabel);
    });

    const cancelBg = this.add.rectangle(0, 150, 120, 40, 0x6b7280);
    const cancelText = this.add.text(0, 150, 'Cancel', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    this.overlayContainer.add([cancelBg, cancelText]);
  }

  private showConstructionOverlay(message: string) {
    this.overlayContainer = this.add.container(400, 300);
    this.overlayContainer.setDepth(1000);

    const bg = this.add.rectangle(0, 0, 350, 150, 0x000000, 0.85);
    bg.setStrokeStyle(3, 0xfbbf24);
    this.overlayContainer.add(bg);

    const icon = this.add.text(0, -35, '🚧', { fontSize: '48px' }).setOrigin(0.5);
    this.overlayContainer.add(icon);

    const text = this.add.text(0, 25, message, {
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 300 },
    }).setOrigin(0.5);
    this.overlayContainer.add(text);
  }
}
