import * as Phaser from 'phaser';
import { WorldMockData, PlayerData } from '../worldMockData';

/**
 * Lobby Debug Scene - Renders the Town Square lobby without server connection
 *
 * Uses mock data to display players, objects, and overlays for testing/screenshots.
 */

const COLORS = {
  sky: 0x87CEEB,
  mountains: 0xE8F4F8,
  mountains2: 0xD4E8F0,
  snow: 0xFAFAFA,
  path: 0x8B6914,
  building: {
    cafe: 0x8B4513,
    shop: 0x4A90A4,
    club: 0x9B59B6,
  },
};

export default class LobbyDebugScene extends Phaser.Scene {
  private mockData!: WorldMockData;
  private playerSprites: Phaser.GameObjects.Container[] = [];
  private overlayContainer?: Phaser.GameObjects.Container;

  constructor() {
    super('lobbyDebugScene');
  }

  create() {
    this.mockData = this.registry.get('mockData') || { zoneId: 'lobby', zoneName: 'Town Square', players: [], objects: [], localPlayerId: '' };

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

    // Sky gradient
    const skyGradient = this.add.graphics();
    skyGradient.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x5BA3C6, 0x5BA3C6, 1);
    skyGradient.fillRect(0, 0, width, 400);
    skyGradient.setDepth(-100);

    // Mountains
    const mountains = this.add.graphics();
    mountains.fillStyle(COLORS.mountains, 1);
    mountains.beginPath();
    mountains.moveTo(0, 280);
    mountains.lineTo(100, 200);
    mountains.lineTo(200, 250);
    mountains.lineTo(320, 180);
    mountains.lineTo(450, 240);
    mountains.lineTo(550, 190);
    mountains.lineTo(680, 230);
    mountains.lineTo(800, 200);
    mountains.lineTo(800, 280);
    mountains.closePath();
    mountains.fill();
    mountains.setDepth(-90);

    // Secondary mountains
    const mountains2 = this.add.graphics();
    mountains2.fillStyle(COLORS.mountains2, 1);
    mountains2.beginPath();
    mountains2.moveTo(0, 300);
    mountains2.lineTo(150, 260);
    mountains2.lineTo(280, 290);
    mountains2.lineTo(400, 250);
    mountains2.lineTo(520, 280);
    mountains2.lineTo(650, 255);
    mountains2.lineTo(800, 290);
    mountains2.lineTo(800, 320);
    mountains2.lineTo(0, 320);
    mountains2.closePath();
    mountains2.fill();
    mountains2.setDepth(-85);

    // Snow ground
    const snowGround = this.add.graphics();
    snowGround.fillStyle(COLORS.snow, 1);
    snowGround.fillRect(0, 320, width, 280);
    snowGround.setDepth(-80);

    // Wooden path
    const path = this.add.graphics();
    path.fillStyle(COLORS.path, 1);
    path.fillRect(300, 400, 200, 180);
    path.setDepth(-70);

    // Buildings
    this.createBuilding(80, 280, COLORS.building.cafe, '☕', 'Cafe');
    this.createBuilding(400, 260, COLORS.building.shop, '🎁', 'Shop');
    this.createBuilding(700, 280, COLORS.building.club, '🎵', 'Club');

    // Environment props
    this.createLampPost(200, 380);
    this.createLampPost(580, 390);
    this.add.text(280, 370, '⛄', { fontSize: '40px' }).setOrigin(0.5).setDepth(-20);
  }

  private createBuilding(x: number, y: number, color: number, emoji: string, label: string) {
    const g = this.add.graphics();

    // Building body
    g.fillStyle(color, 1);
    g.fillRoundedRect(x - 60, y, 120, 100, 8);

    // Roof with snow
    g.fillStyle(0x654321, 1);
    g.beginPath();
    g.moveTo(x - 70, y);
    g.lineTo(x, y - 40);
    g.lineTo(x + 70, y);
    g.closePath();
    g.fill();

    // Snow on roof
    g.fillStyle(0xFFFFFF, 1);
    g.beginPath();
    g.moveTo(x - 65, y - 5);
    g.lineTo(x, y - 35);
    g.lineTo(x + 65, y - 5);
    g.lineTo(x + 55, y + 5);
    g.lineTo(x, y - 25);
    g.lineTo(x - 55, y + 5);
    g.closePath();
    g.fill();

    // Door
    g.fillStyle(0x4A3728, 1);
    g.fillRoundedRect(x - 15, y + 50, 30, 50, 4);

    // Windows
    g.fillStyle(0xFFF8DC, 1);
    g.fillRect(x - 40, y + 25, 25, 25);
    g.fillRect(x + 15, y + 25, 25, 25);

    g.setDepth(-50);

    // Emoji sign
    this.add.text(x, y - 55, emoji, { fontSize: '28px' }).setOrigin(0.5).setDepth(-49);

    // Label
    this.add.text(x, y + 105, label, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { x: 6, y: 2 },
    }).setOrigin(0.5).setDepth(-49);
  }

  private createLampPost(x: number, y: number) {
    const g = this.add.graphics();

    // Post
    g.fillStyle(0x2C3E50, 1);
    g.fillRect(x - 3, y, 6, 80);

    // Lamp head
    g.fillRect(x - 12, y - 5, 24, 8);

    // Light glow
    g.fillStyle(0xFFF8DC, 0.8);
    g.fillCircle(x, y + 5, 8);
    g.fillStyle(0xFFF8DC, 0.2);
    g.fillCircle(x, y + 20, 25);

    g.setDepth(-40);
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

    // Body (circle)
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

    // VIP crown
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

    // Background
    const bg = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.85);
    this.overlayContainer.add(bg);

    // Title
    const title = this.add.text(0, -120, '🕹️ SELECT A GAME', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlayContainer.add(title);

    // Game options
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

    // Cancel button
    const cancelBg = this.add.rectangle(0, 150, 120, 40, 0x6b7280);
    const cancelText = this.add.text(0, 150, 'Cancel', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);
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
