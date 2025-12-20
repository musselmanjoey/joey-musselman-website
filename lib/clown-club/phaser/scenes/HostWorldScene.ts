import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';

interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  character: string;
  isVIP?: boolean;
}

interface WorldState {
  players: PlayerData[];
  objects: { id: string; type: string; x: number; y: number; emoji: string }[];
}

/**
 * HostWorldScene - Spectator view of the world for TV display
 * Shows the same world as players but without interaction
 */
export class HostWorldScene extends Phaser.Scene {
  private socket!: Socket;
  private players: Map<string, Phaser.GameObjects.Container> = new Map();
  private arcadeOverlay?: Phaser.GameObjects.Container;
  private isShowingArcade = false;
  private queuedPlayers: { id: string; name: string }[] = [];
  private queueUI?: Phaser.GameObjects.Container;
  private startButton?: Phaser.GameObjects.Container;

  constructor() {
    super('HostWorldScene');
  }

  create() {
    this.socket = this.registry.get('socket');
    this.players.clear();

    console.log('[HostWorld] Creating scene, socket:', !!this.socket);

    // Create the world background (same as player's LobbyScene)
    this.createBackground();

    // Setup socket listeners
    this.setupSocketListeners();

    // Request world state
    this.socket.emit('cc:request-state');
  }

  private createBackground() {
    // Sky gradient
    const skyGradient = this.add.graphics();
    skyGradient.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x5BA3C6, 0x5BA3C6, 1);
    skyGradient.fillRect(0, 0, 1280, 500);
    skyGradient.setDepth(-100);

    // Distant mountains
    const mountains = this.add.graphics();
    mountains.fillStyle(0xE8F4F8, 1);
    mountains.beginPath();
    mountains.moveTo(0, 350);
    mountains.lineTo(160, 250);
    mountains.lineTo(320, 310);
    mountains.lineTo(510, 220);
    mountains.lineTo(720, 300);
    mountains.lineTo(880, 240);
    mountains.lineTo(1090, 290);
    mountains.lineTo(1280, 250);
    mountains.lineTo(1280, 350);
    mountains.closePath();
    mountains.fill();
    mountains.setDepth(-90);

    // Secondary mountains
    const mountains2 = this.add.graphics();
    mountains2.fillStyle(0xD4E8F0, 1);
    mountains2.beginPath();
    mountains2.moveTo(0, 380);
    mountains2.lineTo(240, 330);
    mountains2.lineTo(450, 370);
    mountains2.lineTo(640, 310);
    mountains2.lineTo(830, 350);
    mountains2.lineTo(1040, 320);
    mountains2.lineTo(1280, 370);
    mountains2.lineTo(1280, 400);
    mountains2.lineTo(0, 400);
    mountains2.closePath();
    mountains2.fill();
    mountains2.setDepth(-85);

    // Main snowy ground
    const snowGround = this.add.graphics();
    snowGround.fillStyle(0xFAFAFA, 1);
    snowGround.fillRect(0, 400, 1280, 320);
    snowGround.setDepth(-80);

    // Snow texture patches
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 1280;
      const y = 420 + Math.random() * 280;
      const size = 25 + Math.random() * 50;
      this.add.ellipse(x, y, size, size * 0.4, 0xFFFFFF, 0.6).setDepth(-79);
    }

    // Icy patches
    this.add.ellipse(240, 580, 100, 40, 0xB8E0F0, 0.5).setDepth(-78);
    this.add.ellipse(960, 620, 120, 45, 0xB8E0F0, 0.4).setDepth(-78);
    this.add.ellipse(560, 650, 90, 30, 0xB8E0F0, 0.5).setDepth(-78);

    // Wooden walkway
    const path = this.add.graphics();
    path.fillStyle(0x8B6914, 1);
    path.fillRect(480, 480, 320, 220);
    path.setDepth(-70);
    for (let y = 490; y < 700; y += 30) {
      path.lineStyle(2, 0x6B4F12);
      path.lineBetween(480, y, 800, y);
    }

    // Buildings (scaled up for 1280x720)
    this.createBuilding(130, 340, 0x8B4513, '☕', 'Cafe');
    this.createBuilding(640, 320, 0x4A90A4, '🎁', 'Shop');
    this.createBuilding(1120, 340, 0x9B59B6, '🎵', 'Club');

    // Props
    this.createLampPost(320, 460);
    this.createLampPost(930, 470);
    this.createBench(190, 540);
    this.createBench(1040, 560);
    this.createSnowyTree(80, 420);
    this.createSnowyTree(1200, 430);
    this.createSnowyTree(50, 500);

    // Snowman
    this.add.text(450, 440, '⛄', { fontSize: '50px' }).setOrigin(0.5).setDepth(-20);

    // Arcade machine (interactive object)
    this.add.text(640, 520, '🕹️', { fontSize: '48px' }).setOrigin(0.5).setDepth(-10);
    this.add.text(640, 560, 'Arcade', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(-10);

    // TV Display label
    this.add.text(640, 30, '📺 CLOWN CLUB TV', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#00000050',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(1000);
  }

  private createBuilding(x: number, y: number, color: number, emoji: string, label: string) {
    const g = this.add.graphics();
    const scale = 1.6; // Scale up for TV

    g.fillStyle(color, 1);
    g.fillRoundedRect(x - 60 * scale / 2, y, 120 * scale / 2, 100 * scale / 2, 8);

    g.fillStyle(0x654321, 1);
    g.beginPath();
    g.moveTo(x - 70 * scale / 2, y);
    g.lineTo(x, y - 40 * scale / 2);
    g.lineTo(x + 70 * scale / 2, y);
    g.closePath();
    g.fill();

    g.fillStyle(0xFFFFFF, 1);
    g.beginPath();
    g.moveTo(x - 65 * scale / 2, y - 5);
    g.lineTo(x, y - 35 * scale / 2);
    g.lineTo(x + 65 * scale / 2, y - 5);
    g.lineTo(x + 55 * scale / 2, y + 5);
    g.lineTo(x, y - 25 * scale / 2);
    g.lineTo(x - 55 * scale / 2, y + 5);
    g.closePath();
    g.fill();

    g.fillStyle(0x4A3728, 1);
    g.fillRoundedRect(x - 15 * scale / 2, y + 50 * scale / 2, 30 * scale / 2, 50 * scale / 2, 4);

    g.fillStyle(0xFFF8DC, 1);
    g.fillRect(x - 40 * scale / 2, y + 25 * scale / 2, 25 * scale / 2, 25 * scale / 2);
    g.fillRect(x + 15 * scale / 2, y + 25 * scale / 2, 25 * scale / 2, 25 * scale / 2);

    g.setDepth(-50);

    this.add.text(x, y - 55 * scale / 2, emoji, { fontSize: '36px' }).setOrigin(0.5).setDepth(-49);
    this.add.text(x, y + 105 * scale / 2, label, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(-49);
  }

  private createLampPost(x: number, y: number) {
    const g = this.add.graphics();
    g.fillStyle(0x2C3E50, 1);
    g.fillRect(x - 4, y, 8, 100);
    g.fillRect(x - 16, y - 8, 32, 10);
    g.fillStyle(0xFFF8DC, 0.8);
    g.fillCircle(x, y + 8, 10);
    g.fillStyle(0xFFF8DC, 0.2);
    g.fillCircle(x, y + 25, 30);
    g.setDepth(-40);
  }

  private createBench(x: number, y: number) {
    const g = this.add.graphics();
    g.fillStyle(0x8B4513, 1);
    g.fillRect(x - 30, y, 60, 10);
    g.fillRect(x - 30, y - 18, 60, 8);
    g.fillStyle(0x5D3A1A, 1);
    g.fillRect(x - 26, y + 10, 5, 18);
    g.fillRect(x + 21, y + 10, 5, 18);
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillRect(x - 29, y - 2, 58, 4);
    g.setDepth(-35);
  }

  private createSnowyTree(x: number, y: number) {
    const g = this.add.graphics();
    g.fillStyle(0x5D4037, 1);
    g.fillRect(x - 6, y + 50, 12, 40);

    g.fillStyle(0x2E7D32, 1);
    g.beginPath();
    g.moveTo(x - 45, y + 55);
    g.lineTo(x, y + 12);
    g.lineTo(x + 45, y + 55);
    g.closePath();
    g.fill();

    g.beginPath();
    g.moveTo(x - 35, y + 30);
    g.lineTo(x, y - 12);
    g.lineTo(x + 35, y + 30);
    g.closePath();
    g.fill();

    g.beginPath();
    g.moveTo(x - 25, y + 6);
    g.lineTo(x, y - 32);
    g.lineTo(x + 25, y + 6);
    g.closePath();
    g.fill();

    g.fillStyle(0xFFFFFF, 0.9);
    g.beginPath();
    g.moveTo(x - 38, y + 55);
    g.lineTo(x, y + 18);
    g.lineTo(x + 38, y + 55);
    g.lineTo(x + 25, y + 55);
    g.lineTo(x, y + 30);
    g.lineTo(x - 25, y + 55);
    g.closePath();
    g.fill();

    g.setDepth(-30);
  }

  private setupSocketListeners() {
    // World state
    this.socket.on('cc:world-state', (state: WorldState) => {
      console.log('[HostWorld] Received world state:', state.players.length, 'players');
      this.handleWorldState(state);
    });

    // Player moved
    this.socket.on('cc:player-moved', (data: { playerId: string; x: number; y: number }) => {
      this.movePlayer(data.playerId, data.x, data.y);
    });

    // Player joined - server sends playerId/playerName, we need to map to id/name
    this.socket.on('cc:player-joined', (data: { playerId: string; playerName: string; x: number; y: number; character: string; isVIP?: boolean }) => {
      console.log('[HostWorld] Player joined:', data.playerName);
      this.addPlayer({
        id: data.playerId,
        name: data.playerName,
        x: data.x,
        y: data.y,
        character: data.character,
        isVIP: data.isVIP,
      });
    });

    // Player left
    this.socket.on('cc:player-left', (data: { playerId: string }) => {
      console.log('[HostWorld] Player left:', data.playerId);
      this.removePlayer(data.playerId);
    });

    // Emote
    this.socket.on('cc:emote-played', (data: { playerId: string; emoteId: string }) => {
      this.showEmote(data.playerId, data.emoteId);
    });

    // Chat
    this.socket.on('cc:chat-message', (data: { playerId: string; message: string }) => {
      this.showChat(data.playerId, data.message);
    });

    // Game started - switch to game scene
    this.socket.on('game:started', () => {
      console.log('[HostWorld] Game started, switching to board game scene');
      this.hideArcadeOverlay();
      if (this.queueUI) {
        this.queueUI.destroy();
        this.queueUI = undefined;
      }
      this.scene.start('HostBoardGameScene');
    });

    // Arcade activated - show arcade video/content
    this.socket.on('cc:arcade-activated', (data: { playerId: string; playerName: string; objectId: string }) => {
      console.log('[HostWorld] Arcade activated by:', data.playerName);
      this.showArcadeOverlay(data.playerName);
    });

    // Game queue update - show waiting players
    this.socket.on('game:queue-update', (data: { gameType: string; players: { id: string; name: string }[]; count: number }) => {
      console.log('[HostWorld] Queue update:', data.count, 'players waiting');
      this.queuedPlayers = data.players;
      this.updateQueueUI();
    });
  }

  private updateQueueUI() {
    // Remove existing queue UI
    if (this.queueUI) {
      this.queueUI.destroy();
      this.queueUI = undefined;
    }

    // If no players in queue, hide everything
    if (this.queuedPlayers.length === 0) {
      this.hideArcadeOverlay();
      return;
    }

    // Create queue UI
    this.queueUI = this.add.container(640, 360);
    this.queueUI.setDepth(2000);

    // Dark background
    const bg = this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.85);
    this.queueUI.add(bg);

    // Title
    const title = this.add.text(0, -250, '🕹️ GAME LOBBY 🕹️', {
      fontSize: '56px',
      color: '#00ff00',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.queueUI.add(title);

    // Subtitle
    const subtitle = this.add.text(0, -180, 'Players Ready to Play', {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.queueUI.add(subtitle);

    // Player list
    this.queuedPlayers.forEach((player, i) => {
      const y = -100 + i * 50;
      const playerText = this.add.text(0, y, `🤡 ${player.name}`, {
        fontSize: '32px',
        color: '#60a5fa',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.queueUI?.add(playerText);
    });

    // Player count
    const countText = this.add.text(0, 100, `${this.queuedPlayers.length} player${this.queuedPlayers.length !== 1 ? 's' : ''} ready`, {
      fontSize: '24px',
      color: '#fbbf24',
    }).setOrigin(0.5);
    this.queueUI.add(countText);

    // Start button (interactive for host)
    this.createStartButton();
  }

  private createStartButton() {
    if (!this.queueUI) return;

    const buttonY = 200;

    const buttonBg = this.add.rectangle(0, buttonY, 300, 80, 0x22c55e);
    buttonBg.setStrokeStyle(4, 0xffffff);
    buttonBg.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(0, buttonY, '▶ START GAME', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.queueUI.add([buttonBg, buttonText]);

    // Button hover effects
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x16a34a);
      buttonBg.setScale(1.05);
      buttonText.setScale(1.05);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x22c55e);
      buttonBg.setScale(1);
      buttonText.setScale(1);
    });

    buttonBg.on('pointerdown', () => {
      console.log('[HostWorld] Start button clicked!');
      this.socket.emit('game:start-queued');
      buttonBg.setFillStyle(0x15803d);
    });

    // Pulsing animation to draw attention
    this.tweens.add({
      targets: [buttonBg, buttonText],
      scale: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private showArcadeOverlay(playerName: string) {
    if (this.isShowingArcade) return;
    this.isShowingArcade = true;

    // Create overlay container
    this.arcadeOverlay = this.add.container(640, 360);
    this.arcadeOverlay.setDepth(2000);

    // Dark background
    const bg = this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.9);
    this.arcadeOverlay.add(bg);

    // Arcade frame
    const frame = this.add.rectangle(0, 0, 900, 550, 0x2a2a2a);
    frame.setStrokeStyle(8, 0x00ff00);
    this.arcadeOverlay.add(frame);

    // Arcade screen area
    const screen = this.add.rectangle(0, -20, 840, 420, 0x111111);
    this.arcadeOverlay.add(screen);

    // Arcade title
    const title = this.add.text(0, -200, '🕹️ ARCADE 🕹️', {
      fontSize: '48px',
      color: '#00ff00',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.arcadeOverlay.add(title);

    // Player selection text
    const playerText = this.add.text(0, -120, `${playerName} is choosing a game...`, {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.arcadeOverlay.add(playerText);

    // Animated arcade graphics
    const arcadeEmoji = this.add.text(0, 20, '🎮', {
      fontSize: '120px',
    }).setOrigin(0.5);
    this.arcadeOverlay.add(arcadeEmoji);

    // Pulsing animation
    this.tweens.add({
      targets: arcadeEmoji,
      scale: 1.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Neon glow effect on title
    this.tweens.add({
      targets: title,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Game options (visual only)
    const games = ['🎲 Board Rush', '💬 Caption Contest', '🎯 Trivia'];
    games.forEach((game, i) => {
      const gameOption = this.add.text(-200 + i * 200, 160, game, {
        fontSize: '24px',
        color: '#ffff00',
        backgroundColor: '#333333',
        padding: { x: 15, y: 10 },
      }).setOrigin(0.5);
      this.arcadeOverlay?.add(gameOption);
    });

    // Instructions
    const instructions = this.add.text(0, 240, 'Waiting for game selection...', {
      fontSize: '20px',
      color: '#888888',
    }).setOrigin(0.5);
    this.arcadeOverlay.add(instructions);

    // Dots animation
    let dots = 0;
    this.time.addEvent({
      delay: 500,
      callback: () => {
        dots = (dots + 1) % 4;
        instructions.setText('Waiting for game selection' + '.'.repeat(dots));
      },
      loop: true,
    });
  }

  private hideArcadeOverlay() {
    if (this.arcadeOverlay) {
      this.arcadeOverlay.destroy();
      this.arcadeOverlay = undefined;
      this.isShowingArcade = false;
    }
  }

  private handleWorldState(state: WorldState) {
    // Clear existing players
    this.players.forEach(p => p.destroy());
    this.players.clear();

    // Add all players
    state.players.forEach(playerData => {
      this.addPlayer(playerData);
    });
  }

  private addPlayer(data: PlayerData) {
    // Scale positions from 800x600 to 1280x720
    const scaleX = 1280 / 800;
    const scaleY = 720 / 600;
    const x = data.x * scaleX;
    const y = data.y * scaleY;

    const container = this.add.container(x, y);
    const children: Phaser.GameObjects.GameObject[] = [];

    // Crown for VIP players
    if (data.isVIP) {
      const crown = this.add.text(0, -35, '👑', { fontSize: '28px' }).setOrigin(0.5);
      children.push(crown);
    }

    // Player body (use their selected character emoji)
    const body = this.add.text(0, 0, data.character || '🤡', { fontSize: '40px' }).setOrigin(0.5);
    children.push(body);

    // Name tag
    const name = this.add.text(0, 30, data.name, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { x: 6, y: 2 },
    }).setOrigin(0.5);
    children.push(name);

    container.add(children);
    container.setDepth(50);

    this.players.set(data.id, container);
  }

  private removePlayer(playerId: string) {
    const player = this.players.get(playerId);
    if (player) {
      player.destroy();
      this.players.delete(playerId);
    }
  }

  private movePlayer(playerId: string, x: number, y: number) {
    const player = this.players.get(playerId);
    if (player) {
      // Scale positions
      const scaleX = 1280 / 800;
      const scaleY = 720 / 600;

      this.tweens.add({
        targets: player,
        x: x * scaleX,
        y: y * scaleY,
        duration: 200,
        ease: 'Linear',
      });
    }
  }

  private showEmote(playerId: string, emoteId: string) {
    const player = this.players.get(playerId);
    if (!player) return;

    const emoteMap: Record<string, string> = {
      wave: '👋',
      dance: '💃',
      laugh: '😂',
      heart: '❤️',
    };

    const emoji = emoteMap[emoteId] || '❓';
    const emote = this.add.text(player.x, player.y - 60, emoji, {
      fontSize: '32px',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: emote,
      y: player.y - 100,
      alpha: 0,
      duration: 1500,
      onComplete: () => emote.destroy(),
    });
  }

  private showChat(playerId: string, message: string) {
    const player = this.players.get(playerId);
    if (!player) return;

    const bubble = this.add.text(player.x, player.y - 60, message, {
      fontSize: '14px',
      color: '#000000',
      backgroundColor: '#ffffff',
      padding: { x: 10, y: 6 },
      wordWrap: { width: 150 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: bubble,
      alpha: 0,
      delay: 3000,
      duration: 500,
      onComplete: () => bubble.destroy(),
    });
  }

  shutdown() {
    this.socket.off('cc:world-state');
    this.socket.off('cc:player-moved');
    this.socket.off('cc:player-joined');
    this.socket.off('cc:player-left');
    this.socket.off('cc:emote-played');
    this.socket.off('cc:chat-message');
    this.socket.off('game:started');
    this.socket.off('cc:arcade-activated');
    this.socket.off('game:queue-update');
    this.hideArcadeOverlay();
    if (this.queueUI) {
      this.queueUI.destroy();
      this.queueUI = undefined;
    }
    this.players.clear();
  }
}
