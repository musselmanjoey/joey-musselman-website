import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { characters } from '../assets/AssetRegistry';
import { gameEvents } from '../../gameEvents';
import {
  createLobbyBackground,
  createGamesRoomBackground,
  createRecordStoreBackground,
} from '../WorldRenderer';
import { LobbyTheme, ArcadeTheme, RecordsTheme } from '../ThemeLoader';

type Direction = 'down' | 'left' | 'right' | 'up';

interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  character: string;
  isVIP?: boolean;
}

interface PlayerContainer extends Phaser.GameObjects.Container {
  sprite?: Phaser.GameObjects.Sprite;
  emoji?: Phaser.GameObjects.Text;
  spriteKey?: string | null;
  currentDirection?: Direction;
  isMoving?: boolean;
  lastX?: number;
  lastY?: number;
}

interface ObjectData {
  id: string;
  type: string;
  x: number;
  y: number;
  emoji: string;
  label?: string;
  action?: string;
  targetZone?: string;
  gameType?: string;
  message?: string;
  width?: number;
  height?: number;
}

interface WorldState {
  zoneId?: string;
  zoneName?: string;
  players: PlayerData[];
  objects: ObjectData[];
}

// Zone configuration mirroring server's ZoneConfig.js
// Positions are in player coordinates (800x600)
const HOST_ZONES: Record<string, { name: string; objects: ObjectData[] }> = {
  lobby: {
    name: 'Town Square',
    objects: [
      { id: 'door-cafe', type: 'door', x: 189, y: 315, emoji: '', action: 'under-construction', label: 'Cafe', message: 'The Cafe is coming soon! ☕' },
      { id: 'door-records', type: 'door', x: 407, y: 300, emoji: '', action: 'zone-change', targetZone: 'records', label: 'Records' },
      { id: 'door-arcade', type: 'door', x: 630, y: 322, emoji: '', action: 'zone-change', targetZone: 'games', label: 'Arcade' },
    ],
  },
  games: {
    name: 'Game Room',
    objects: [
      { id: 'door-lobby', type: 'door', x: 92, y: 376, emoji: '', action: 'zone-change', targetZone: 'lobby', label: 'Exit' },
      { id: 'arcade-caption', type: 'arcade', x: 249, y: 316, emoji: '', action: 'launch-game', gameType: 'caption-contest', label: 'Caption Contest' },
      { id: 'arcade-board', type: 'arcade', x: 356, y: 319, emoji: '', action: 'launch-game', gameType: 'board-game', label: 'Board Rush' },
      { id: 'arcade-about', type: 'arcade', x: 459, y: 319, emoji: '', action: 'launch-game', gameType: 'about-you', label: 'About You' },
      { id: 'arcade-newlywebs', type: 'arcade', x: 560, y: 316, emoji: '', action: 'under-construction', label: 'Newly Webs', message: 'Newly Webs is coming soon! 🕸️' },
      { id: 'stats-panel', type: 'info', x: 716, y: 261, emoji: '', action: 'under-construction', label: 'Leaderboard', message: 'Leaderboard coming soon! 📊' },
    ],
  },
  records: {
    name: 'Record Store',
    objects: [
      { id: 'vinyl-browser', type: 'vinyl', x: 97, y: 314, emoji: '', action: 'host-vinyl', label: 'Browse Collection', width: 120, height: 150 },
      { id: 'door-lobby', type: 'door', x: 241, y: 302, emoji: '', action: 'zone-change', targetZone: 'lobby', label: 'Exit', width: 80, height: 60 },
      { id: 'dj-booth', type: 'dj', x: 430, y: 312, emoji: '', action: 'host-playback', label: 'DJ Booth', width: 160, height: 120 },
      { id: 'review-board', type: 'info', x: 653, y: 217, emoji: '', action: 'host-reviews', label: 'Reviews', width: 100, height: 100 },
    ],
  },
};

// Implemented games that can be started
const IMPLEMENTED_GAMES = ['board-game', 'caption-contest', 'about-you'];

/**
 * HostWorldScene - Spectator view of the world for TV display
 * Shows the same world as players but without interaction
 */
export class HostWorldScene extends Phaser.Scene {
  private socket!: Socket;
  private players: Map<string, PlayerContainer> = new Map();
  private queuedPlayers: { id: string; name: string }[] = [];
  private queueUI?: Phaser.GameObjects.Container;
  private currentZone: string = 'lobby';
  private backgroundContainer?: Phaser.GameObjects.Container;
  private objectsContainer?: Phaser.GameObjects.Container;
  private interactiveAreas: Phaser.GameObjects.Container[] = [];
  private gameActiveData?: { gameType: string };
  private viewGameButton?: Phaser.GameObjects.Container;
  private selectedGameType?: string;
  private lobbyTheme?: LobbyTheme;
  private arcadeTheme?: ArcadeTheme;
  private recordsTheme?: RecordsTheme;
  private hoverLabel?: Phaser.GameObjects.Text;
  private constructionOverlay?: Phaser.GameObjects.Container;

  // Scale factors: player view is 800x600, host view is 1280x720
  private static readonly SCALE_X = 1280 / 800;
  private static readonly SCALE_Y = 720 / 600;

  constructor() {
    super('HostWorldScene');
  }

  create() {
    this.socket = this.registry.get('socket');
    this.lobbyTheme = this.registry.get('lobbyTheme');
    this.arcadeTheme = this.registry.get('arcadeTheme');
    this.recordsTheme = this.registry.get('recordsTheme');
    this.players.clear();
    this.interactiveAreas = [];
    this.currentZone = 'lobby';
    this.gameActiveData = undefined;

    // Create containers
    this.backgroundContainer = this.add.container(0, 0);
    this.backgroundContainer.setDepth(-100);
    this.objectsContainer = this.add.container(0, 0);
    this.objectsContainer.setDepth(-10);

    // Create the world background and interactive areas
    this.createBackground();
    this.createInteractiveAreas();

    // Setup socket listeners
    this.setupSocketListeners();

    // Request world state for current zone
    this.socket.emit('cc:request-state');
  }

  /**
   * Create interactive clickable areas for the current zone
   * Doors allow zone switching, arcade cabinets show game overlays
   */
  private createInteractiveAreas() {
    // Clear existing interactive areas
    this.interactiveAreas.forEach(area => area.destroy());
    this.interactiveAreas = [];

    const zoneConfig = HOST_ZONES[this.currentZone];
    if (!zoneConfig) return;

    for (const obj of zoneConfig.objects) {
      this.createInteractiveArea(obj);
    }
  }

  private createInteractiveArea(obj: ObjectData) {
    const x = obj.x * HostWorldScene.SCALE_X;
    const y = obj.y * HostWorldScene.SCALE_Y;
    const width = (obj.width || 60) * HostWorldScene.SCALE_X;
    const height = (obj.height || 60) * HostWorldScene.SCALE_Y;

    // Determine if this object is interactive
    const isImplemented = obj.action !== 'under-construction' &&
      (obj.action !== 'launch-game' || IMPLEMENTED_GAMES.includes(obj.gameType || ''));

    const container = this.add.container(x, y);
    container.setDepth(100);

    // Invisible hit area
    const hitArea = this.add.rectangle(0, 0, width, height, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: isImplemented });
    container.add(hitArea);

    // Click handler
    hitArea.on('pointerdown', () => {
      this.handleObjectClick(obj);
    });

    // Hover effects
    hitArea.on('pointerover', () => {
      if (obj.label) {
        this.showHoverLabel(x, y - height / 2 - 20, obj.label);
      }
    });

    hitArea.on('pointerout', () => {
      this.hideHoverLabel();
    });

    this.interactiveAreas.push(container);
  }

  private handleObjectClick(obj: ObjectData) {
    switch (obj.action) {
      case 'zone-change':
        if (obj.targetZone) {
          this.switchToZone(obj.targetZone);
        }
        break;
      case 'launch-game':
        if (obj.gameType && IMPLEMENTED_GAMES.includes(obj.gameType)) {
          this.showGameQueueForType(obj.gameType, obj.label || obj.gameType);
        }
        break;
      case 'under-construction':
        this.showConstructionMessage(obj.message || 'Coming soon!', obj.label);
        break;
      case 'host-vinyl':
        gameEvents.emit('rs:host-vinyl-browser');
        break;
      case 'host-playback':
        gameEvents.emit('rs:host-playback-controls');
        break;
      case 'host-reviews':
        gameEvents.emit('rs:host-reviews');
        break;
    }
  }

  private showHoverLabel(x: number, y: number, text: string) {
    this.hideHoverLabel();
    this.hoverLabel = this.add.text(x, y, text, {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#000000cc',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(200);
  }

  private hideHoverLabel() {
    if (this.hoverLabel) {
      this.hoverLabel.destroy();
      this.hoverLabel = undefined;
    }
  }

  private showConstructionMessage(message: string, label?: string) {
    this.hideConstructionMessage();

    this.constructionOverlay = this.add.container(640, 360);
    this.constructionOverlay.setDepth(1000);

    const bg = this.add.rectangle(0, 0, 400, 180, 0x000000, 0.9);
    bg.setStrokeStyle(3, 0xfbbf24);
    bg.setInteractive({ useHandCursor: true });
    this.constructionOverlay.add(bg);

    const icon = this.add.text(0, -45, '🚧', { fontSize: '56px' }).setOrigin(0.5);
    this.constructionOverlay.add(icon);

    const messageText = this.add.text(0, 30, message, {
      fontSize: '22px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 350 },
    }).setOrigin(0.5);
    this.constructionOverlay.add(messageText);

    // Auto-hide after 2 seconds or on click
    this.time.delayedCall(2000, () => this.hideConstructionMessage());
    bg.on('pointerdown', () => this.hideConstructionMessage());
  }

  private hideConstructionMessage() {
    if (this.constructionOverlay) {
      this.constructionOverlay.destroy();
      this.constructionOverlay = undefined;
    }
  }

  private switchToZone(zoneId: string) {
    // Fade out transition
    this.cameras.main.fadeOut(300, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.currentZone = zoneId;

      // Clear current players
      this.players.forEach(p => p.destroy());
      this.players.clear();

      // Clear background and objects
      if (this.backgroundContainer) {
        this.backgroundContainer.removeAll(true);
      }
      if (this.objectsContainer) {
        this.objectsContainer.removeAll(true);
      }

      // Recreate background and interactive areas for new zone
      this.createBackground();
      this.createInteractiveAreas();

      // Tell server to switch spectator zone
      this.socket.emit('cc:spectator-change-zone', { zoneId });

      // Fade back in
      this.cameras.main.fadeIn(300, 0, 0, 0);
    });
  }

  private createBackground() {
    if (!this.backgroundContainer) return;

    // Create zone-specific background
    if (this.currentZone === 'games') {
      createGamesRoomBackground(this, this.backgroundContainer, {
        width: 1280,
        height: 720,
      }, this.arcadeTheme);
    } else if (this.currentZone === 'records') {
      createRecordStoreBackground(this, this.backgroundContainer, {
        width: 1280,
        height: 720,
      }, this.recordsTheme);
    } else {
      createLobbyBackground(this, this.backgroundContainer, {
        width: 1280,
        height: 720,
        scaleX: HostWorldScene.SCALE_X,
        scaleY: HostWorldScene.SCALE_Y,
      }, this.lobbyTheme);
    }

    // Zone label at top (shows current zone name)
    const zoneName = HOST_ZONES[this.currentZone]?.name || 'Unknown';
    const zoneLabel = this.add.text(640, 30, `📺 ${zoneName.toUpperCase()}`, {
      fontSize: '28px',
      color: '#171717',
      fontStyle: 'bold',
      backgroundColor: '#ffffff90',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(1000);
    this.backgroundContainer.add(zoneLabel);
  }

  private showGameQueueForType(gameType: string, gameName: string) {
    this.selectedGameType = gameType;

    // Request current queue state from server
    this.socket.emit('game:request-queue');

    // Show the overlay (will update when queue-update event arrives)
    this.showGameSelectionOverlay(gameType, gameName);
  }

  private showGameSelectionOverlay(gameType: string, gameName: string) {
    // Remove any existing queue UI
    if (this.queueUI) {
      this.queueUI.destroy();
      this.queueUI = undefined;
    }

    this.queueUI = this.add.container(640, 360);
    this.queueUI.setDepth(2000);

    // Dark background
    const bg = this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.9);
    this.queueUI.add(bg);

    // Game title
    const title = this.add.text(0, -250, `🕹️ ${gameName.toUpperCase()} 🕹️`, {
      fontSize: '56px',
      color: '#dc2626',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.queueUI.add(title);

    // Filter players in queue for this game type
    const playersForGame = this.queuedPlayers;

    if (playersForGame.length === 0) {
      const noPlayers = this.add.text(0, -50, 'No players in queue yet', {
        fontSize: '28px',
        color: '#6b7280',
      }).setOrigin(0.5);
      this.queueUI.add(noPlayers);

      const waitingText = this.add.text(0, 20, 'Waiting for players to join...', {
        fontSize: '20px',
        color: '#9ca3af',
      }).setOrigin(0.5);
      this.queueUI.add(waitingText);
    } else {
      // Subtitle
      const subtitle = this.add.text(0, -180, 'Players Ready to Play', {
        fontSize: '28px',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.queueUI.add(subtitle);

      // Player list
      playersForGame.forEach((player, i) => {
        const y = -100 + i * 50;
        const playerText = this.add.text(0, y, `🤡 ${player.name}`, {
          fontSize: '32px',
          color: '#ffffff',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        this.queueUI?.add(playerText);
      });

      // Player count
      const countText = this.add.text(0, 100, `${playersForGame.length} player${playersForGame.length !== 1 ? 's' : ''} ready`, {
        fontSize: '24px',
        color: '#fbbf24',
      }).setOrigin(0.5);
      this.queueUI.add(countText);

      // Start button
      this.createStartButtonInOverlay(200);
    }

    // Back button (top-right corner, visible)
    const backBtn = this.add.rectangle(500, -300, 140, 50, 0x6b7280);
    backBtn.setStrokeStyle(2, 0xffffff);
    backBtn.setInteractive({ useHandCursor: true });
    const backText = this.add.text(500, -300, '← Back', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    backBtn.on('pointerdown', () => {
      this.hideGameSelectionOverlay();
    });
    backBtn.on('pointerover', () => backBtn.setFillStyle(0x4b5563));
    backBtn.on('pointerout', () => backBtn.setFillStyle(0x6b7280));

    this.queueUI.add([backBtn, backText]);
  }

  private createStartButtonInOverlay(buttonY: number) {
    if (!this.queueUI) return;

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
      this.socket.emit('game:start-queued');
      buttonBg.setFillStyle(0x15803d);
    });

    // Pulsing animation
    this.tweens.add({
      targets: [buttonBg, buttonText],
      scale: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private hideGameSelectionOverlay() {
    this.selectedGameType = undefined;
    if (this.queueUI) {
      this.queueUI.destroy();
      this.queueUI = undefined;
    }
  }

  private setupSocketListeners() {
    // World state
    this.socket.on('cc:world-state', (state: WorldState) => {
      this.handleWorldState(state);
    });

    // Player moved
    this.socket.on('cc:player-moved', (data: { playerId: string; x: number; y: number }) => {
      this.movePlayer(data.playerId, data.x, data.y);
    });

    // Player joined - server sends playerId/playerName, we need to map to id/name
    this.socket.on('cc:player-joined', (data: { playerId: string; playerName: string; x: number; y: number; character: string; isVIP?: boolean }) => {
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

    // Game started - show View Game button (don't auto-switch)
    this.socket.on('game:started', (data: { gameType?: string }) => {
      const gameType = data?.gameType || 'board-game';
      this.gameActiveData = { gameType };
      this.selectedGameType = undefined;
      if (this.queueUI) {
        this.queueUI.destroy();
        this.queueUI = undefined;
      }
      // Emit event for external listeners (page.tsx)
      gameEvents.emit('game-started', { gameType });
      // Show view game button
      this.showViewGameButton();
    });

    // Game ended - hide view game button
    this.socket.on('game:ended', () => {
      this.gameActiveData = undefined;
      this.hideViewGameButton();
      gameEvents.emit('game-ended', {});
    });

    // Game queue update - store players but only refresh if viewing
    this.socket.on('game:queue-update', (data: { gameType: string; players: { id: string; name: string }[]; count: number }) => {
      this.queuedPlayers = data.players || [];
      // Only refresh the overlay if host is already viewing this game
      if (this.selectedGameType && this.queueUI) {
        const gameName = this.getGameName(this.selectedGameType);
        this.showGameSelectionOverlay(this.selectedGameType, gameName);
      }
    });
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

  private getGameName(gameType: string): string {
    const gameNames: Record<string, string> = {
      'board-game': 'Board Rush',
      'caption-contest': 'Caption Contest',
      'about-you': 'About You',
    };
    return gameNames[gameType] || gameType;
  }

  private addPlayer(data: PlayerData) {
    // Scale positions from 800x600 to 1280x720
    const x = data.x * HostWorldScene.SCALE_X;
    const y = data.y * HostWorldScene.SCALE_Y;

    const container = this.add.container(x, y) as PlayerContainer;
    const children: Phaser.GameObjects.GameObject[] = [];

    // Character can be either:
    // - A sprite key directly (e.g., 'clown-white', 'clown-blue')
    // - An emoji for legacy support (e.g., '🤡')
    let spriteKey: string | null = null;
    if (data.character?.startsWith('clown-') || data.character === 'penguin-blue' || data.character === 'green-cap') {
      spriteKey = data.character;
    } else {
      // Legacy: look up sprite key from emoji
      const charConfig = Object.entries(characters).find(
        ([, config]) => config.emoji === data.character
      );
      spriteKey = charConfig?.[1].spriteKey || null;
    }
    container.spriteKey = spriteKey;
    container.currentDirection = 'down';
    container.isMoving = false;
    container.lastX = x;
    container.lastY = y;

    // Crown for VIP players
    if (data.isVIP) {
      const crown = this.add.text(0, spriteKey ? -45 : -35, '👑', { fontSize: '28px' }).setOrigin(0.5);
      children.push(crown);
    }

    // Create sprite or fallback to emoji
    if (spriteKey && this.textures.exists(spriteKey)) {
      const sprite = this.add.sprite(0, 0, spriteKey);
      sprite.setOrigin(0.5, 0.5);
      // Scale sprites for host display (256px * 0.35 = ~90px)
      if (spriteKey.startsWith('clown-')) {
        sprite.setScale(0.35);
      } else if (spriteKey === 'green-cap') {
        sprite.setScale(2.5);
      }
      sprite.play(`${spriteKey}-idle-down`);
      container.sprite = sprite;
      children.push(sprite);
    } else {
      // Fallback to emoji
      const body = this.add.text(0, 0, data.character || '🤡', { fontSize: '40px' }).setOrigin(0.5);
      container.emoji = body;
      children.push(body);
    }

    // Name tag
    const nameTagY = spriteKey ? 45 : 30;
    const name = this.add.text(0, nameTagY, data.name, {
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

  private getDirection(dx: number, dy: number): Direction {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy) {
      return dx < 0 ? 'left' : 'right';
    } else {
      return dy < 0 ? 'up' : 'down';
    }
  }

  private playPlayerAnimation(player: PlayerContainer, direction: Direction, moving: boolean) {
    if (!player.sprite || !player.spriteKey) return;

    const animType = moving ? 'walk' : 'idle';
    const animKey = `${player.spriteKey}-${animType}-${direction}`;

    if (player.sprite.anims.currentAnim?.key !== animKey) {
      player.sprite.play(animKey);
    }
  }

  private movePlayer(playerId: string, x: number, y: number) {
    const player = this.players.get(playerId);
    if (player) {
      // Kill any existing movement tween for this player
      this.tweens.killTweensOf(player);

      // Scale positions
      const targetX = x * HostWorldScene.SCALE_X;
      const targetY = y * HostWorldScene.SCALE_Y;

      // Calculate direction based on movement from CURRENT position
      const dx = targetX - player.x;
      const dy = targetY - player.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        const direction = this.getDirection(dx, dy);
        player.currentDirection = direction;
        player.isMoving = true;
        this.playPlayerAnimation(player, direction, true);
      }

      // Calculate distance and duration to match player speed (200 px/sec)
      const distance = Math.sqrt(dx * dx + dy * dy);
      const moveSpeed = 200; // pixels per second, same as Player
      const duration = Math.max(50, (distance / moveSpeed) * 1000);

      this.tweens.add({
        targets: player,
        x: targetX,
        y: targetY,
        duration,
        ease: 'Linear',
        onComplete: () => {
          // Play idle animation when stopped
          if (player.isMoving) {
            player.isMoving = false;
            this.playPlayerAnimation(player, player.currentDirection || 'down', false);
          }
        },
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

  private showViewGameButton() {
    if (this.viewGameButton) return;

    this.viewGameButton = this.add.container(1160, 660);
    this.viewGameButton.setDepth(2001);

    const bg = this.add.rectangle(0, 0, 200, 50, 0xdc2626);
    bg.setStrokeStyle(3, 0xffffff);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, '🎮 View Game', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.viewGameButton.add([bg, text]);

    // Click handler - switch to game scene
    bg.on('pointerdown', () => {
      if (this.gameActiveData) {
        let sceneName = 'HostBoardGameScene';
        if (this.gameActiveData.gameType === 'caption-contest') {
          sceneName = 'HostCaptionContestScene';
        } else if (this.gameActiveData.gameType === 'about-you') {
          sceneName = 'HostAboutYouScene';
        }
        this.scene.start(sceneName);
      }
    });

    bg.on('pointerover', () => {
      bg.setFillStyle(0xb91c1c);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0xdc2626);
    });

    // Pulsing animation to draw attention
    this.tweens.add({
      targets: [bg, text],
      scale: 1.05,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private hideViewGameButton() {
    if (this.viewGameButton) {
      this.viewGameButton.destroy();
      this.viewGameButton = undefined;
    }
  }

  shutdown() {
    this.socket.off('cc:world-state');
    this.socket.off('cc:player-moved');
    this.socket.off('cc:player-joined');
    this.socket.off('cc:player-left');
    this.socket.off('cc:emote-played');
    this.socket.off('cc:chat-message');
    this.socket.off('game:started');
    this.socket.off('game:ended');
    this.socket.off('game:queue-update');

    // Clean up UI elements
    this.hideViewGameButton();
    this.hideHoverLabel();
    this.hideConstructionMessage();
    this.hideGameSelectionOverlay();

    // Clean up interactive areas
    this.interactiveAreas.forEach(area => area.destroy());
    this.interactiveAreas = [];

    this.players.clear();
  }
}
