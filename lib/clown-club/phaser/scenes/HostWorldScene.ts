import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { characters } from '../assets/AssetRegistry';
import { gameEvents } from '../../gameEvents';
import {
  createLobbyBackground,
  createGamesRoomBackground,
  createRecordStoreBackground,
  resolveCharacterSpriteKey,
  getSpriteScale,
  getSpritePositions,
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
}

interface WorldState {
  zoneId?: string;
  zoneName?: string;
  players: PlayerData[];
  objects: ObjectData[];
}

/**
 * HostWorldScene - Spectator view of the world for TV display
 * Shows the same world as players but without interaction
 */
export class HostWorldScene extends Phaser.Scene {
  private socket!: Socket;
  private players: Map<string, PlayerContainer> = new Map();
  private queuedPlayers: { id: string; name: string }[] = [];
  private queueUI?: Phaser.GameObjects.Container;
  private startButton?: Phaser.GameObjects.Container;
  private currentZone: string = 'lobby';
  private zoneTabs?: Phaser.GameObjects.Container;
  private backgroundContainer?: Phaser.GameObjects.Container;
  private objectsContainer?: Phaser.GameObjects.Container;
  private gameActiveData?: { gameType: string };
  private viewGameButton?: Phaser.GameObjects.Container;
  private selectedGameType?: string; // Which game the host is viewing
  private lobbyTheme?: LobbyTheme;
  private arcadeTheme?: ArcadeTheme;
  private recordsTheme?: RecordsTheme;
  private tvLabel?: Phaser.GameObjects.Text;

  constructor() {
    super('HostWorldScene');
  }

  create() {
    this.socket = this.registry.get('socket');
    this.lobbyTheme = this.registry.get('lobbyTheme');
    this.arcadeTheme = this.registry.get('arcadeTheme');
    this.recordsTheme = this.registry.get('recordsTheme');
    this.players.clear();
    this.currentZone = 'lobby';
    this.gameActiveData = undefined;

    console.log('[HostWorld] Creating scene, socket:', !!this.socket);

    // Create containers
    this.backgroundContainer = this.add.container(0, 0);
    this.backgroundContainer.setDepth(-100);
    this.objectsContainer = this.add.container(0, 0);
    this.objectsContainer.setDepth(-10);

    // Create zone tabs at top
    this.createZoneTabs();

    // Create the world background (same as player's LobbyScene)
    this.createBackground();

    // Setup socket listeners
    this.setupSocketListeners();

    // Request world state for current zone
    this.socket.emit('cc:request-state');
  }

  private createZoneTabs() {
    this.zoneTabs = this.add.container(640, 70);
    this.zoneTabs.setDepth(1001);

    // Tab background
    const tabBg = this.add.rectangle(0, 0, 540, 50, 0x000000, 0.7);
    tabBg.setStrokeStyle(2, 0xffffff);
    this.zoneTabs.add(tabBg);

    // Lobby tab
    const lobbyTab = this.createTab(-180, 0, 'Lobby', 'lobby');
    this.zoneTabs.add(lobbyTab);

    // Records tab
    const recordsTab = this.createTab(0, 0, 'Records', 'records');
    this.zoneTabs.add(recordsTab);

    // Games tab
    const gamesTab = this.createTab(180, 0, 'Games', 'games');
    this.zoneTabs.add(gamesTab);
  }

  private createTab(x: number, y: number, label: string, zoneId: string): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const isActive = this.currentZone === zoneId;

    const bg = this.add.rectangle(0, 0, 180, 40, isActive ? 0xdc2626 : 0x333333);
    bg.setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(2, isActive ? 0xffffff : 0x666666);

    const text = this.add.text(0, 0, label, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: isActive ? 'bold' : 'normal',
    }).setOrigin(0.5);

    container.add([bg, text]);

    // Click handler
    bg.on('pointerdown', () => {
      if (this.currentZone !== zoneId) {
        this.switchToZone(zoneId);
      }
    });

    bg.on('pointerover', () => {
      if (this.currentZone !== zoneId) {
        bg.setFillStyle(0x555555);
      }
    });

    bg.on('pointerout', () => {
      if (this.currentZone !== zoneId) {
        bg.setFillStyle(0x333333);
      }
    });

    return container;
  }

  private switchToZone(zoneId: string) {
    this.currentZone = zoneId;

    // Recreate tabs to update active state
    if (this.zoneTabs) {
      this.zoneTabs.destroy();
    }
    this.createZoneTabs();

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

    // Recreate background for new zone
    this.createBackground();

    // Tell server to switch spectator zone
    this.socket.emit('cc:spectator-change-zone', { zoneId });
  }

  private createBackground() {
    if (this.currentZone === 'games') {
      this.createGamesRoomBackgroundWithObjects();
    } else if (this.currentZone === 'records') {
      this.createRecordStoreBackgroundWithObjects();
    } else {
      this.createLobbyBackgroundWithObjects();
    }

    // TV Display label (always shown) - destroy old one first
    if (this.tvLabel) {
      this.tvLabel.destroy();
    }
    this.tvLabel = this.add.text(640, 30, '📺 CLOWN CLUB TV', {
      fontSize: '28px',
      color: '#171717',
      fontStyle: 'bold',
      backgroundColor: '#ffffff90',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setDepth(1000);
  }

  private createLobbyBackgroundWithObjects() {
    // Use shared renderer for background (with scale for 1280x720)
    if (this.backgroundContainer) {
      createLobbyBackground(this, this.backgroundContainer, {
        width: 1280,
        height: 720,
        scaleX: 1280 / 800,
        scaleY: 720 / 600,
      }, this.lobbyTheme);
    }

    // Add lobby-specific objects
    this.createLobbyObjects();
  }

  private createLobbyObjects() {
    // Host uses tabs for zone switching, no door needed
  }

  private createGamesRoomBackgroundWithObjects() {
    // Use shared renderer for background with arcade theme
    if (this.backgroundContainer) {
      createGamesRoomBackground(this, this.backgroundContainer, {
        width: 1280,
        height: 720,
      }, this.arcadeTheme);
    }

    // Add click areas for game cabinets (invisible when using themed bg)
    if (this.arcadeTheme?.background) {
      this.createThemedArcadeClickAreas();
    } else {
      this.createGamesRoomObjects();
    }
  }

  private createRecordStoreBackgroundWithObjects() {
    // Use shared renderer for background with records theme
    if (this.backgroundContainer) {
      createRecordStoreBackground(this, this.backgroundContainer, {
        width: 1280,
        height: 720,
      }, this.recordsTheme);
    }
    // Record store is view-only for host - no interactive elements needed
  }

  private createThemedArcadeClickAreas() {
    // Scale factors: player view is 800x600, host view is 1280x720
    const scaleX = 1280 / 800;
    const scaleY = 720 / 600;

    // Arcade cabinet positions from ZoneConfig (player coordinates)
    const cabinets = [
      { x: 249, y: 316, label: 'Caption Contest', gameType: 'caption-contest', implemented: true },
      { x: 356, y: 319, label: 'Board Rush', gameType: 'board-game', implemented: true },
      { x: 459, y: 319, label: 'About You', gameType: 'about-you', implemented: true },
      { x: 560, y: 316, label: 'Newly Webs', gameType: 'newly-webs', implemented: false },
    ];

    cabinets.forEach(cab => {
      const x = cab.x * scaleX;
      const y = cab.y * scaleY;

      // Invisible hit area
      const hitArea = this.add.rectangle(x, y, 100 * scaleX, 120 * scaleY, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: cab.implemented });

      if (cab.implemented) {
        hitArea.on('pointerdown', () => {
          this.showGameQueueForType(cab.gameType, cab.label);
        });
        hitArea.on('pointerover', () => {
          // Show hover label
          if (!this.tvLabel || this.tvLabel.text !== cab.label) {
            this.tvLabel?.destroy();
            this.tvLabel = this.add.text(x, y - 80, cab.label, {
              fontSize: '18px',
              color: '#ffffff',
              backgroundColor: '#000000cc',
              padding: { x: 10, y: 5 },
            }).setOrigin(0.5).setDepth(100);
          }
        });
        hitArea.on('pointerout', () => {
          this.tvLabel?.destroy();
          this.tvLabel = undefined;
        });
      }

      this.objectsContainer?.add(hitArea);
    });
  }

  private createGamesRoomObjects() {
    // Scale factors: player view is 800x600, host view is 1280x720
    const scaleX = 1280 / 800;
    const scaleY = 720 / 600;

    // EXIT sign above door area (left side)
    const exitSign = this.add.text(80 * scaleX, 420, 'EXIT', {
      fontSize: '24px',
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 10, y: 6 },
    });
    exitSign.setOrigin(0.5);
    this.objectsContainer?.add(exitSign);

    // Door back to lobby (matches server: x:80, y:520)
    const door = this.add.text(80 * scaleX, 520 * scaleY, '🚪', { fontSize: '56px' }).setOrigin(0.5);
    this.objectsContainer?.add(door);
    const doorLabel = this.add.text(80 * scaleX, 560 * scaleY, 'Exit', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5);
    this.objectsContainer?.add(doorLabel);

    // Arcade cabinets - matching server ZoneConfig.js positions
    // Server defines: Caption Contest (150), Board Rush (300), About You (500), Newly Webs (650)
    this.createArcadeCabinet(150 * scaleX, 180 * scaleY + 100, '📸', 'Caption Contest', 'caption-contest');
    this.createArcadeCabinet(300 * scaleX, 180 * scaleY + 100, '🎲', 'Board Rush', 'board-game');
    this.createArcadeCabinet(500 * scaleX, 180 * scaleY + 100, '💭', 'About You', 'about-you');
    this.createArcadeCabinet(650 * scaleX, 180 * scaleY + 100, '🕸️', 'Newly Webs', 'newly-webs');
  }

  private createArcadeCabinet(x: number, y: number, emoji: string, label: string, gameType: string) {
    // Check if this game is implemented
    const implementedGames = ['board-game', 'caption-contest', 'about-you'];
    const isImplemented = implementedGames.includes(gameType);

    // Cabinet body - grayed out if not implemented
    const cabinet = this.add.graphics();
    const cabinetColor = isImplemented ? 0x2d2d44 : 0x1a1a2a;
    const screenColor = isImplemented ? 0x00ffff : 0x333355;
    cabinet.fillStyle(cabinetColor, 1);
    cabinet.fillRoundedRect(x - 50, y - 60, 100, 120, 8);
    cabinet.fillStyle(screenColor, isImplemented ? 0.3 : 0.2);
    cabinet.fillRect(x - 40, y - 50, 80, 60);
    cabinet.setDepth(-5);
    this.objectsContainer?.add(cabinet);

    // Emoji
    const icon = this.add.text(x, y - 20, emoji, { fontSize: '48px' }).setOrigin(0.5);
    if (!isImplemented) icon.setAlpha(0.5);
    this.objectsContainer?.add(icon);

    // Label
    const labelText = this.add.text(x, y + 80, label, {
      fontSize: '18px',
      color: isImplemented ? '#ffffff' : '#888888',
      backgroundColor: '#000000aa',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5);
    this.objectsContainer?.add(labelText);

    // "Coming Soon" badge for unimplemented games
    if (!isImplemented) {
      const badge = this.add.text(x, y + 30, '🚧 Soon', {
        fontSize: '12px',
        color: '#fbbf24',
        backgroundColor: '#000000cc',
        padding: { x: 6, y: 2 },
      }).setOrigin(0.5);
      this.objectsContainer?.add(badge);
    }

    // Interactive hit area for host to click (only for implemented games)
    if (isImplemented) {
      const hitArea = this.add.rectangle(x, y, 120, 140, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        this.showGameQueueForType(gameType, label);
      });
      hitArea.on('pointerover', () => {
        cabinet.clear();
        cabinet.fillStyle(0x3d3d54, 1);
        cabinet.fillRoundedRect(x - 50, y - 60, 100, 120, 8);
        cabinet.fillStyle(0x00ffff, 0.5);
        cabinet.fillRect(x - 40, y - 50, 80, 60);
      });
      hitArea.on('pointerout', () => {
        cabinet.clear();
        cabinet.fillStyle(0x2d2d44, 1);
        cabinet.fillRoundedRect(x - 50, y - 60, 100, 120, 8);
        cabinet.fillStyle(0x00ffff, 0.3);
        cabinet.fillRect(x - 40, y - 50, 80, 60);
      });
      this.objectsContainer?.add(hitArea);
    }
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
    console.log('[HostWorld] playersForGame:', playersForGame, 'length:', playersForGame.length);

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
      console.log('[HostWorld] Start button clicked for game:', this.selectedGameType);
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
    this.backgroundContainer?.add(g);

    const emojiText = this.add.text(x, y - 55 * scale / 2, emoji, { fontSize: '36px' }).setOrigin(0.5).setDepth(-49);
    const labelText = this.add.text(x, y + 105 * scale / 2, label, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(-49);
    this.backgroundContainer?.add([emojiText, labelText]);
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
    this.backgroundContainer?.add(g);
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
    this.backgroundContainer?.add(g);
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
    this.backgroundContainer?.add(g);
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

    // Game started - show View Game button (don't auto-switch)
    this.socket.on('game:started', (data: { gameType?: string }) => {
      const gameType = data?.gameType || 'board-game';
      console.log("[HostWorld] Game started, type:", gameType);
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
      console.log('[HostWorld] Game ended');
      this.gameActiveData = undefined;
      this.hideViewGameButton();
      gameEvents.emit('game-ended', {});
    });

    // Game queue update - store players but only refresh if viewing
    this.socket.on('game:queue-update', (data: { gameType: string; players: { id: string; name: string }[]; count: number }) => {
      this.queuedPlayers = data.players || [];
      // Only refresh the overlay if host is already viewing this game
      if (this.selectedGameType && this.queueUI) {
        const gameName = this.selectedGameType === 'board-game' ? 'Board Rush' : 'Caption Contest';
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

  private addPlayer(data: PlayerData) {
    // Scale positions from 800x600 to 1280x720
    const scaleX = 1280 / 800;
    const scaleY = 720 / 600;
    const x = data.x * scaleX;
    const y = data.y * scaleY;

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
      const scaleX = 1280 / 800;
      const scaleY = 720 / 600;
      const targetX = x * scaleX;
      const targetY = y * scaleY;

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
        console.log('[HostWorld] Manual switch to:', sceneName);
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
    this.hideViewGameButton();
    if (this.queueUI) {
      this.queueUI.destroy();
      this.queueUI = undefined;
    }
    this.players.clear();
  }
}
