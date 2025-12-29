import * as Phaser from 'phaser';
import { WorldMockData, PlayerData } from '../worldMockData';

/**
 * Record Store Debug Scene - Renders the Record Store without server connection
 *
 * Uses mock data to display players, vinyl shelves, DJ booth, and overlays.
 */

const COLORS = {
  wall: 0x1a1a2e,
  wallAccent: 0x2d2d44,
  floor: 0x8b4513,
  floorGrain: 0x6b3410,
  vinyl: [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181, 0xaa96da],
  neon: 0xdc2626,
};

export default class RecordsDebugScene extends Phaser.Scene {
  private mockData!: WorldMockData;
  private playerSprites: Phaser.GameObjects.Container[] = [];
  private overlayContainer?: Phaser.GameObjects.Container;

  constructor() {
    super('recordsDebugScene');
  }

  create() {
    this.mockData = this.registry.get('mockData') || { zoneId: 'records', zoneName: 'Record Store', players: [], objects: [], localPlayerId: '' };

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

    // Dark moody background
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.wall).setDepth(-100);

    // Back wall
    this.add.rectangle(width / 2, 200, width, 200, COLORS.wallAccent).setDepth(-95);

    // Wooden floor
    this.add.rectangle(width / 2, height - 75, width, 150, COLORS.floor).setDepth(-90);

    // Floor grain lines
    const floorGraphics = this.add.graphics();
    floorGraphics.setDepth(-89);
    floorGraphics.lineStyle(1, COLORS.floorGrain, 0.3);
    for (let i = 0; i < 10; i++) {
      floorGraphics.lineBetween(0, height - 150 + i * 15, width, height - 150 + i * 15);
    }

    // Vinyl shelves
    this.createVinylShelves(100, 280);

    // DJ booth
    this.createDJBooth(550, 320);

    // Review board
    this.createReviewBoard(680, 350);

    // Exit door
    this.createExitDoor(80, 370);

    // Now playing display
    this.createNowPlayingDisplay(width / 2, 50);

    // Ambient lighting
    this.createAmbientLighting();
  }

  private createVinylShelves(x: number, y: number) {
    const container = this.add.container(x, y);
    container.setDepth(-50);

    // Shelf backing
    const backing = this.add.rectangle(0, 0, 200, 180, 0x3d3d5c);
    container.add(backing);

    // Shelf lines
    const shelves = this.add.graphics();
    shelves.fillStyle(0x5d4e37);
    shelves.fillRect(-100, -60, 200, 8);
    shelves.fillRect(-100, 0, 200, 8);
    shelves.fillRect(-100, 60, 200, 8);
    container.add(shelves);

    // Vinyl records on shelves
    for (let shelf = 0; shelf < 3; shelf++) {
      for (let slot = 0; slot < 6; slot++) {
        const record = this.add.rectangle(
          -80 + slot * 28,
          -40 + shelf * 60,
          20,
          45,
          COLORS.vinyl[(shelf * 6 + slot) % COLORS.vinyl.length]
        );
        container.add(record);
      }
    }

    // Label
    const label = this.add.text(0, 100, 'COLLECTION', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(label);
  }

  private createDJBooth(x: number, y: number) {
    const container = this.add.container(x, y);
    container.setDepth(-50);

    // DJ table
    const table = this.add.rectangle(0, 20, 160, 80, 0x2d2d44);
    container.add(table);

    // Turntables
    const leftTT = this.add.circle(-40, 10, 30, 0x1a1a2e);
    const rightTT = this.add.circle(40, 10, 30, 0x1a1a2e);
    container.add([leftTT, rightTT]);

    // Vinyl on turntables
    const leftVinyl = this.add.circle(-40, 10, 25, 0x0a0a0a);
    const rightVinyl = this.add.circle(40, 10, 25, 0x0a0a0a);
    container.add([leftVinyl, rightVinyl]);

    // Center labels
    const leftLabel = this.add.circle(-40, 10, 8, COLORS.neon);
    const rightLabel = this.add.circle(40, 10, 8, COLORS.neon);
    container.add([leftLabel, rightLabel]);

    // Mixer
    const mixer = this.add.rectangle(0, 10, 30, 50, 0x3d3d5c);
    container.add(mixer);

    // Label
    const label = this.add.text(0, 70, 'DJ BOOTH', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(label);
  }

  private createReviewBoard(x: number, y: number) {
    const container = this.add.container(x, y);
    container.setDepth(-50);

    // Cork board
    const board = this.add.rectangle(0, 0, 100, 120, 0xc4a35a);
    board.setStrokeStyle(4, 0x5d4e37);
    container.add(board);

    // Pinned notes
    const noteColors = [0xfff8dc, 0xffe4e1, 0xe0ffff];
    for (let i = 0; i < 3; i++) {
      const note = this.add.rectangle(-20 + i * 25, -20 + i * 15, 40, 35, noteColors[i]);
      note.setAngle(-5 + i * 5);
      container.add(note);

      const pin = this.add.circle(-20 + i * 25, -35 + i * 15, 4, COLORS.neon);
      container.add(pin);
    }

    // Label
    const label = this.add.text(0, 75, 'REVIEWS', {
      fontSize: '14px',
      color: '#ffffff',
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
  }

  private createNowPlayingDisplay(x: number, y: number) {
    const container = this.add.container(x, y);
    container.setDepth(100);

    // Background bar
    const bg = this.add.rectangle(0, 0, 400, 40, 0x000000, 0.7);
    bg.setStrokeStyle(1, COLORS.neon);
    container.add(bg);

    // Music note
    const icon = this.add.text(-180, 0, '🎵', { fontSize: '20px' }).setOrigin(0.5);
    container.add(icon);

    // Now playing text
    const text = this.add.text(0, 0, 'No music playing', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(text);
  }

  private createAmbientLighting() {
    const lighting = this.add.graphics();
    lighting.setDepth(-70);

    // Warm spotlight on DJ booth
    lighting.fillStyle(0xffa500, 0.1);
    lighting.fillCircle(550, 280, 120);

    // Cool spotlight on vinyl shelves
    lighting.fillStyle(0x4ecdc4, 0.08);
    lighting.fillCircle(100, 280, 100);
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

    switch (this.mockData.overlayState) {
      case 'vinyl-browser':
        this.showVinylBrowserOverlay();
        break;
      case 'dj-controls':
        this.showDJControlsOverlay();
        break;
      case 'reviews':
        this.showReviewsOverlay();
        break;
    }
  }

  private showVinylBrowserOverlay() {
    this.overlayContainer = this.add.container(400, 300);
    this.overlayContainer.setDepth(1000);

    const bg = this.add.rectangle(0, 0, 600, 400, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(3, COLORS.neon);
    this.overlayContainer.add(bg);

    const title = this.add.text(0, -160, '💿 VINYL COLLECTION', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlayContainer.add(title);

    // Mock vinyl records
    const records = [
      { name: 'Summer Vibes', artist: 'DJ Cool', color: 0xff6b6b },
      { name: 'Night Drive', artist: 'Synth Wave', color: 0x4ecdc4 },
      { name: 'Chill Beats', artist: 'Lo-Fi King', color: 0xfbbf24 },
      { name: 'Dance Floor', artist: 'Club Master', color: 0x9b59b6 },
    ];

    records.forEach((record, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = -120 + col * 240;
      const y = -50 + row * 120;

      const vinyl = this.add.circle(x - 40, y, 35, 0x0a0a0a);
      vinyl.setStrokeStyle(2, record.color);
      this.overlayContainer!.add(vinyl);

      const center = this.add.circle(x - 40, y, 10, record.color);
      this.overlayContainer!.add(center);

      const name = this.add.text(x + 20, y - 15, record.name, {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      this.overlayContainer!.add(name);

      const artist = this.add.text(x + 20, y + 5, record.artist, {
        fontSize: '12px',
        color: '#9ca3af',
      });
      this.overlayContainer!.add(artist);
    });

    // Close button
    const closeBg = this.add.rectangle(0, 160, 100, 36, 0x6b7280);
    const closeText = this.add.text(0, 160, 'Close', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    this.overlayContainer.add([closeBg, closeText]);
  }

  private showDJControlsOverlay() {
    this.overlayContainer = this.add.container(400, 300);
    this.overlayContainer.setDepth(1000);

    const bg = this.add.rectangle(0, 0, 500, 300, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(3, COLORS.neon);
    this.overlayContainer.add(bg);

    const title = this.add.text(0, -120, '🎧 DJ CONTROLS', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlayContainer.add(title);

    // Now playing
    const nowPlaying = this.add.text(0, -60, 'Now Playing: Summer Vibes - DJ Cool', {
      fontSize: '16px',
      color: '#fbbf24',
    }).setOrigin(0.5);
    this.overlayContainer.add(nowPlaying);

    // Progress bar
    const progressBg = this.add.rectangle(0, -20, 300, 8, 0x3d3d5c);
    const progress = this.add.rectangle(-75, -20, 150, 8, COLORS.neon);
    this.overlayContainer.add([progressBg, progress]);

    // Time
    const time = this.add.text(0, 0, '1:45 / 3:30', {
      fontSize: '12px',
      color: '#9ca3af',
    }).setOrigin(0.5);
    this.overlayContainer.add(time);

    // Control buttons
    const controls = ['⏮️', '⏸️', '⏭️'];
    controls.forEach((ctrl, i) => {
      const btn = this.add.text(-60 + i * 60, 50, ctrl, { fontSize: '32px' }).setOrigin(0.5);
      this.overlayContainer!.add(btn);
    });

    // Close button
    const closeBg = this.add.rectangle(0, 120, 100, 36, 0x6b7280);
    const closeText = this.add.text(0, 120, 'Close', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    this.overlayContainer.add([closeBg, closeText]);
  }

  private showReviewsOverlay() {
    this.overlayContainer = this.add.container(400, 300);
    this.overlayContainer.setDepth(1000);

    const bg = this.add.rectangle(0, 0, 500, 350, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(3, COLORS.neon);
    this.overlayContainer.add(bg);

    const title = this.add.text(0, -150, '📝 REVIEWS', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.overlayContainer.add(title);

    // Mock reviews
    const reviews = [
      { user: 'Alice', text: 'Love the vinyl selection!', stars: '⭐⭐⭐⭐⭐' },
      { user: 'Bob', text: 'Great atmosphere for music lovers.', stars: '⭐⭐⭐⭐' },
      { user: 'Carol', text: 'The DJ booth is amazing!', stars: '⭐⭐⭐⭐⭐' },
    ];

    reviews.forEach((review, i) => {
      const y = -80 + i * 70;

      const userText = this.add.text(-200, y - 15, review.user, {
        fontSize: '14px',
        color: '#fbbf24',
        fontStyle: 'bold',
      });
      this.overlayContainer!.add(userText);

      const starsText = this.add.text(200, y - 15, review.stars, {
        fontSize: '12px',
      }).setOrigin(1, 0);
      this.overlayContainer!.add(starsText);

      const reviewText = this.add.text(-200, y + 10, review.text, {
        fontSize: '13px',
        color: '#e5e7eb',
      });
      this.overlayContainer!.add(reviewText);
    });

    // Close button
    const closeBg = this.add.rectangle(0, 140, 100, 36, 0x6b7280);
    const closeText = this.add.text(0, 140, 'Close', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    this.overlayContainer.add([closeBg, closeText]);
  }
}
