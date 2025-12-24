import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { Player } from '../entities/Player';
import { RemotePlayer } from '../entities/RemotePlayer';
import { InteractiveObject } from '../entities/InteractiveObject';
import { GameInfo, InteractionResult, GameStartedData } from '../../types';
import { gameEvents } from '../../gameEvents';
import { LobbyTheme, THEME_ASSET_KEYS } from '../ThemeLoader';

interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  character: string;
  isVIP?: boolean;
}

interface ObjectData {
  id: string;
  type: string;
  x: number;
  y: number;
  emoji: string;
  action?: string;
}

interface WorldState {
  players: PlayerData[];
  objects: ObjectData[];
}

export class LobbyScene extends Phaser.Scene {
  private socket!: Socket;
  private playerId!: string;
  private localPlayer?: Player;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private interactiveObjects: InteractiveObject[] = [];
  private boundSocketListeners: Map<string, (...args: unknown[]) => void> = new Map();
  private waitingOverlay?: Phaser.GameObjects.Container;
  private waitingText?: Phaser.GameObjects.Text;
  private gameSelectOverlay?: Phaser.GameObjects.Container;
  private constructionOverlay?: Phaser.GameObjects.Container;
  private waitingDotsTimer?: Phaser.Time.TimerEvent;
  private lastMoveTime: number = 0;
  private static readonly MOVE_THROTTLE_MS = 100;
  private lobbyTheme?: LobbyTheme;
  private themeAssetsLoaded = false;
  private debugCoordText?: Phaser.GameObjects.Text;
  private static readonly DEBUG_MODE = false; // Set to true to enable coordinate display

  constructor() {
    super('LobbyScene');
  }

  create() {
    // Get socket and player data from registry
    this.socket = this.registry.get('socket');
    this.playerId = this.registry.get('playerId');

    // Get theme info from registry
    this.lobbyTheme = this.registry.get('lobbyTheme');
    this.themeAssetsLoaded = this.registry.get('themeAssetsLoaded') || false;

    // Create background (themed if assets loaded, otherwise procedural)
    if (this.themeAssetsLoaded && this.lobbyTheme) {
      this.createThemedBackground();
    } else {
      this.createProceduralBackground();
    }

    // Setup socket listeners
    this.setupSocketListeners();

    // Setup input
    this.setupInput();

    // Register cleanup on scene shutdown/sleep
    this.events.once('shutdown', () => this.cleanup());
    this.events.once('sleep', () => this.cleanup());

    // Request world state from server (scene is now ready to receive it)
    this.socket.emit('cc:request-state');

    // Fade in (handles both initial load and returning from other zones)
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Debug mode: show coordinate text
    if (LobbyScene.DEBUG_MODE) {
      this.debugCoordText = this.add.text(10, 560, 'Click to see coordinates', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      });
      this.debugCoordText.setDepth(1000);
    }
  }

  private cleanup() {
    this.cleanupSocketListeners();
    this.hideWaitingOverlay();
    this.hideGameSelector();
    this.hideConstructionMessage();
  }

  /**
   * Create background from loaded theme assets (images)
   */
  private createThemedBackground() {
    if (!this.lobbyTheme) return;

    const width = 800;
    const height = 600;

    // Check for unified background mode
    if (this.lobbyTheme.mode === 'unified' && this.textures.exists(THEME_ASSET_KEYS.BACKGROUND)) {
      // Single unified background image
      const bg = this.add.image(width / 2, height / 2, THEME_ASSET_KEYS.BACKGROUND);
      bg.setDisplaySize(width, height);
      bg.setDepth(-100);
    } else {
      // Layered mode - separate layers
      // Sky layer (full background)
      if (this.textures.exists(THEME_ASSET_KEYS.SKY)) {
        const sky = this.add.image(width / 2, 200, THEME_ASSET_KEYS.SKY);
        sky.setDisplaySize(width, 400);
        sky.setDepth(-100);
      }

      // Horizon layer (mountains/distant scenery)
      if (this.textures.exists(THEME_ASSET_KEYS.HORIZON)) {
        const horizon = this.add.image(width / 2, 300, THEME_ASSET_KEYS.HORIZON);
        horizon.setDisplaySize(width, 200);
        horizon.setDepth(-90);
      }

      // Ground layer
      if (this.textures.exists(THEME_ASSET_KEYS.GROUND)) {
        const ground = this.add.image(width / 2, 450, THEME_ASSET_KEYS.GROUND);
        ground.setDisplaySize(width, 300);
        ground.setDepth(-80);
      }

      // Buildings (only in layered mode)
      if (this.lobbyTheme.buildings) {
        const buildings = this.lobbyTheme.buildings;

        if (this.textures.exists(THEME_ASSET_KEYS.BUILDING_LEFT)) {
          const left = this.add.image(buildings.left.x, buildings.left.y, THEME_ASSET_KEYS.BUILDING_LEFT);
          left.setOrigin(0.5, 1);
          left.setDepth(-50);
          this.add.text(buildings.left.x, buildings.left.y + 10, buildings.left.label, {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#00000080',
            padding: { x: 6, y: 2 },
          }).setOrigin(0.5).setDepth(-49);
        }

        if (this.textures.exists(THEME_ASSET_KEYS.BUILDING_CENTER)) {
          const center = this.add.image(buildings.center.x, buildings.center.y, THEME_ASSET_KEYS.BUILDING_CENTER);
          center.setOrigin(0.5, 1);
          center.setDepth(-50);
          this.add.text(buildings.center.x, buildings.center.y + 10, buildings.center.label, {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#00000080',
            padding: { x: 6, y: 2 },
          }).setOrigin(0.5).setDepth(-49);
        }

        if (this.textures.exists(THEME_ASSET_KEYS.BUILDING_RIGHT)) {
          const right = this.add.image(buildings.right.x, buildings.right.y, THEME_ASSET_KEYS.BUILDING_RIGHT);
          right.setOrigin(0.5, 1);
          right.setDepth(-50);
          this.add.text(buildings.right.x, buildings.right.y + 10, buildings.right.label, {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#00000080',
            padding: { x: 6, y: 2 },
          }).setOrigin(0.5).setDepth(-49);
        }
      }
    }

    // Props (both modes)
    this.lobbyTheme.props.forEach((prop, index) => {
      const key = THEME_ASSET_KEYS.PROP_PREFIX + index;
      if (this.textures.exists(key)) {
        const propSprite = this.add.image(prop.x, prop.y, key);
        propSprite.setOrigin(0.5, 1);
        propSprite.setDepth(-30);
      }
    });

    // Add theme-based effects
    if (this.lobbyTheme.effects?.snowfall) {
      this.createSnowfallEffect();
    }
  }

  /**
   * Create simple snowfall particle effect
   */
  private createSnowfallEffect() {
    // Create a simple snow particle texture using graphics
    if (!this.textures.exists('snowflake')) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff, 0.8);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('snowflake', 8, 8);
      graphics.destroy();
    }

    // Create particle emitter
    const particles = this.add.particles(0, -10, 'snowflake', {
      x: { min: 0, max: 800 },
      y: -10,
      lifespan: 6000,
      speedY: { min: 20, max: 50 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.5, end: 0.2 },
      alpha: { start: 0.8, end: 0 },
      frequency: 100,
      quantity: 1,
    });
    particles.setDepth(-10);
  }

  /**
   * Create background using procedural Phaser graphics (fallback when no theme assets)
   */
  private createProceduralBackground() {
    // Sky gradient (light blue to darker blue)
    const skyGradient = this.add.graphics();
    skyGradient.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x5BA3C6, 0x5BA3C6, 1);
    skyGradient.fillRect(0, 0, 800, 400);
    skyGradient.setDepth(-100);

    // Distant snowy mountains/hills
    const mountains = this.add.graphics();
    mountains.fillStyle(0xE8F4F8, 1);
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

    // Secondary mountain layer (slightly darker)
    const mountains2 = this.add.graphics();
    mountains2.fillStyle(0xD4E8F0, 1);
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

    // Main snowy ground
    const snowGround = this.add.graphics();
    snowGround.fillStyle(0xFAFAFA, 1);
    snowGround.fillRect(0, 320, 800, 280);
    snowGround.setDepth(-80);

    // Snow texture - scattered lighter patches
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 800;
      const y = 340 + Math.random() * 240;
      const size = 20 + Math.random() * 40;
      this.add.ellipse(x, y, size, size * 0.4, 0xFFFFFF, 0.6).setDepth(-79);
    }

    // Icy blue patches on ground
    this.add.ellipse(150, 480, 80, 30, 0xB8E0F0, 0.5).setDepth(-78);
    this.add.ellipse(600, 520, 100, 35, 0xB8E0F0, 0.4).setDepth(-78);
    this.add.ellipse(350, 540, 70, 25, 0xB8E0F0, 0.5).setDepth(-78);

    // Wooden walkway/path
    const path = this.add.graphics();
    path.fillStyle(0x8B6914, 1);
    path.fillRect(300, 400, 200, 180);
    path.setDepth(-70);

    // Path planks
    for (let y = 405; y < 580; y += 25) {
      path.lineStyle(2, 0x6B4F12);
      path.lineBetween(300, y, 500, y);
    }

    // === BUILDINGS ===

    // Left building - Coffee Shop style
    this.createBuilding(80, 280, 0x8B4513, '☕', 'Cafe');

    // Center building - Gift Shop
    this.createBuilding(400, 260, 0x4A90A4, '🎁', 'Shop');

    // Right building - Dance Club
    this.createBuilding(700, 280, 0x9B59B6, '🎵', 'Club');

    // === ENVIRONMENTAL PROPS ===

    // Lamp posts
    this.createLampPost(200, 380);
    this.createLampPost(580, 390);

    // Benches
    this.createBench(120, 450);
    this.createBench(650, 470);

    // Trees (snowy pine trees)
    this.createSnowyTree(50, 350);
    this.createSnowyTree(750, 360);
    this.createSnowyTree(30, 420);

    // Snowman
    this.add.text(280, 370, '⛄', { fontSize: '40px' }).setOrigin(0.5).setDepth(-20);

    // Small snow piles
    this.add.text(180, 500, '❄️', { fontSize: '16px' }).setOrigin(0.5).setDepth(-15);
    this.add.text(520, 480, '❄️', { fontSize: '14px' }).setOrigin(0.5).setDepth(-15);
    this.add.text(420, 550, '❄️', { fontSize: '12px' }).setOrigin(0.5).setDepth(-15);
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

    // Window
    g.fillStyle(0xFFF8DC, 1);
    g.fillRect(x - 40, y + 25, 25, 25);
    g.fillRect(x + 15, y + 25, 25, 25);

    // Window glow
    g.fillStyle(0xFFE4B5, 0.5);
    g.fillRect(x - 38, y + 27, 21, 21);
    g.fillRect(x + 17, y + 27, 21, 21);

    g.setDepth(-50);

    // Building emoji sign
    this.add.text(x, y - 55, emoji, { fontSize: '28px' }).setOrigin(0.5).setDepth(-49);

    // Building label
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
    g.fillStyle(0x2C3E50, 1);
    g.fillRect(x - 12, y - 5, 24, 8);

    // Light glow
    g.fillStyle(0xFFF8DC, 0.8);
    g.fillCircle(x, y + 5, 8);

    // Light rays (subtle)
    g.fillStyle(0xFFF8DC, 0.2);
    g.fillCircle(x, y + 20, 25);

    g.setDepth(-40);
  }

  private createBench(x: number, y: number) {
    const g = this.add.graphics();

    // Seat
    g.fillStyle(0x8B4513, 1);
    g.fillRect(x - 25, y, 50, 8);

    // Back
    g.fillStyle(0x8B4513, 1);
    g.fillRect(x - 25, y - 15, 50, 6);

    // Legs
    g.fillStyle(0x5D3A1A, 1);
    g.fillRect(x - 22, y + 8, 4, 15);
    g.fillRect(x + 18, y + 8, 4, 15);

    // Snow on bench
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillRect(x - 24, y - 2, 48, 3);

    g.setDepth(-35);
  }

  private createSnowyTree(x: number, y: number) {
    const g = this.add.graphics();

    // Trunk
    g.fillStyle(0x5D4037, 1);
    g.fillRect(x - 5, y + 40, 10, 30);

    // Tree layers (bottom to top)
    g.fillStyle(0x2E7D32, 1);
    g.beginPath();
    g.moveTo(x - 35, y + 45);
    g.lineTo(x, y + 10);
    g.lineTo(x + 35, y + 45);
    g.closePath();
    g.fill();

    g.beginPath();
    g.moveTo(x - 28, y + 25);
    g.lineTo(x, y - 10);
    g.lineTo(x + 28, y + 25);
    g.closePath();
    g.fill();

    g.beginPath();
    g.moveTo(x - 20, y + 5);
    g.lineTo(x, y - 25);
    g.lineTo(x + 20, y + 5);
    g.closePath();
    g.fill();

    // Snow on tree
    g.fillStyle(0xFFFFFF, 0.9);
    g.beginPath();
    g.moveTo(x - 30, y + 45);
    g.lineTo(x, y + 15);
    g.lineTo(x + 30, y + 45);
    g.lineTo(x + 20, y + 45);
    g.lineTo(x, y + 25);
    g.lineTo(x - 20, y + 45);
    g.closePath();
    g.fill();

    g.beginPath();
    g.moveTo(x - 22, y + 25);
    g.lineTo(x, y - 5);
    g.lineTo(x + 22, y + 25);
    g.lineTo(x + 15, y + 25);
    g.lineTo(x, y + 5);
    g.lineTo(x - 15, y + 25);
    g.closePath();
    g.fill();

    g.setDepth(-30);
  }

  private setupSocketListeners() {
    // Store bound listeners so we can remove them on shutdown
    const addListener = (event: string, handler: (...args: unknown[]) => void) => {
      this.boundSocketListeners.set(event, handler);
      this.socket.on(event, handler);
    };

    // Initial world state
    addListener('cc:world-state', (state: unknown) => {
      this.handleWorldState(state as WorldState);
    });

    // Player movement
    addListener('cc:player-moved', (data: unknown) => {
      const { playerId, x, y } = data as { playerId: string; x: number; y: number };
      if (playerId === this.playerId) {
        // Server reconciliation for local player (optional)
        return;
      }
      const remote = this.remotePlayers.get(playerId);
      if (remote) {
        remote.moveToPoint(x, y);
      }
    });

    // New player joined
    addListener('cc:player-joined', (data: unknown) => {
      const playerData = data as { playerId: string; playerName: string; x: number; y: number; character: string };
      console.log('[Clown Club] Player joined:', playerData);
      if (playerData.playerId !== this.playerId) {
        this.addRemotePlayer({
          id: playerData.playerId,
          name: playerData.playerName,
          x: playerData.x,
          y: playerData.y,
          character: playerData.character,
        });
      }
    });

    // Player left
    addListener('cc:player-left', (data: unknown) => {
      const { playerId } = data as { playerId: string };
      const remote = this.remotePlayers.get(playerId);
      if (remote) {
        remote.destroy();
        this.remotePlayers.delete(playerId);
      }
    });

    // Emote played
    addListener('cc:emote-played', (data: unknown) => {
      const { playerId, emoteId } = data as { playerId: string; emoteId: string };
      if (playerId === this.playerId) {
        this.localPlayer?.showEmote(emoteId);
      } else {
        const remote = this.remotePlayers.get(playerId);
        remote?.showEmote(emoteId);
      }
    });

    // Interaction result
    addListener('cc:interaction-result', (data: unknown) => {
      const result = data as InteractionResult;
      if (result.success) {
        if (result.action === 'zone-change' && result.targetZone) {
          // Transition to the target zone with fade effect
          this.transitionToZone(result.targetZone);
        } else if (result.action === 'launch-game') {
          // Show game selector overlay
          this.showGameSelector();
        } else if (result.action === 'under-construction') {
          // Show "coming soon" message
          this.showConstructionMessage(result.message || 'Coming soon!', result.label);
        }
      }
    });

    // Zone changed - update scene
    addListener('cc:zone-changed', (data: unknown) => {
      const { zoneId } = data as { zoneId: string; zoneName: string };
      // Scene transition happens in transitionToZone after fade completes
      // The new zone's world state will be received via cc:world-state
      if (zoneId === 'games') {
        // Clean up before switching scenes
        this.cleanupSocketListeners();
        this.scene.start('GamesRoomScene');
      }
      // If going back to lobby, we're already in LobbyScene, just fade in
    });

    // Joined the game queue
    addListener('game:queue-joined', (data: unknown) => {
      const { position, totalPlayers } = data as { position: number; totalPlayers: number };
      console.log('[Clown Club] Joined queue, position:', position);
      this.showWaitingOverlay(totalPlayers);
    });

    // Queue update while waiting
    addListener('game:queue-update', (data: unknown) => {
      const { count } = data as { count: number };
      if (count > 0 && this.waitingOverlay) {
        this.updateWaitingOverlay(count);
      }
    });

    // Left queue
    addListener('game:queue-left', () => {
      console.log('[Clown Club] Left queue');
      this.hideWaitingOverlay();
    });

    // Game started - switch to game scene
    addListener('game:started', (data: unknown) => {
      const gameData = data as GameStartedData;
      console.log('[Clown Club] Game started:', gameData);

      // Hide waiting overlay
      this.hideWaitingOverlay();

      gameEvents.emit('game-started', gameData);

      // Switch to appropriate game scene
      // Players always see mobile controller (isHost: false) - the TV spectator shows the board
      if (gameData.gameType === 'board-game') {
        try {
          // Stop the scene if it's already running (from a previous game)
          if (this.scene.isActive('BoardGameScene') || this.scene.isPaused('BoardGameScene')) {
            console.log('[Clown Club] Stopping existing BoardGameScene');
            this.scene.stop('BoardGameScene');
          }

          // Pause lobby and launch game scene
          this.scene.pause();
          console.log('[Clown Club] Launching BoardGameScene with isHost: false');
          this.scene.launch('BoardGameScene', { isHost: false });
        } catch (error) {
          console.error('[Clown Club] Error launching BoardGameScene:', error);
          // Try to recover by resuming this scene
          this.scene.resume();
        }
      } else if (gameData.gameType === 'caption-contest') {
        try {
          if (this.scene.isActive('CaptionContestScene') || this.scene.isPaused('CaptionContestScene')) {
            console.log('[Clown Club] Stopping existing CaptionContestScene');
            this.scene.stop('CaptionContestScene');
          }
          this.scene.pause();
          console.log('[Clown Club] Launching CaptionContestScene');
          this.scene.launch('CaptionContestScene');
        } catch (error) {
          console.error('[Clown Club] Error launching CaptionContestScene:', error);
          this.scene.resume();
        }
      }
    });

    // Chat message
    addListener('cc:chat-message', (data: unknown) => {
      const { playerId, playerName, message } = data as { playerId: string; playerName: string; message: string };
      if (playerId === this.playerId) {
        this.localPlayer?.showChatBubble(message);
      } else {
        const remote = this.remotePlayers.get(playerId);
        remote?.showChatBubble(message);
      }
    });

    // Handle socket disconnect - show reconnection message
    addListener('disconnect', () => {
      this.handleDisconnect();
    });
  }

  private handleDisconnect() {
    // Disable input while disconnected
    this.input.enabled = false;

    // Show disconnect overlay
    const overlay = this.add.container(400, 300);
    overlay.setDepth(2000);

    const bg = this.add.rectangle(0, 0, 300, 100, 0x000000, 0.9);
    const text = this.add.text(0, 0, 'Connection lost...\nReconnecting', {
      fontSize: '20px',
      color: '#ff6b6b',
      align: 'center',
    }).setOrigin(0.5);

    overlay.add([bg, text]);

    // Listen for reconnection
    this.socket.once('connect', () => {
      overlay.destroy();
      this.input.enabled = true;
      this.socket.emit('cc:request-state');
    });
  }

  // Called when scene is paused or stopped
  private cleanupSocketListeners() {
    for (const [event, handler] of this.boundSocketListeners.entries()) {
      this.socket.off(event, handler);
    }
    this.boundSocketListeners.clear();
  }

  // Called when coming back from a game
  resumeFromGame() {
    this.scene.resume();
    // Re-setup listeners since we cleaned them up
    this.setupSocketListeners();
    // Request fresh world state
    this.socket.emit('cc:request-state');
  }

  private handleWorldState(state: WorldState) {
    // Create interactive objects
    state.objects.forEach((obj) => {
      const interactive = new InteractiveObject(this, obj.x, obj.y, obj.emoji, obj.id);
      this.interactiveObjects.push(interactive);
    });

    // Create players
    state.players.forEach((playerData) => {
      if (playerData.id === this.playerId) {
        // Create local player
        this.localPlayer = new Player(
          this,
          playerData.x,
          playerData.y,
          playerData.name,
          playerData.character,
          playerData.isVIP
        );
      } else {
        // Create remote player
        this.addRemotePlayer(playerData);
      }
    });
  }

  private addRemotePlayer(data: PlayerData) {
    const remote = new RemotePlayer(this, data.x, data.y, data.name, data.character, data.isVIP);
    this.remotePlayers.set(data.id, remote);
  }

  private setupInput() {
    // Tap to move / interact
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Debug mode: show coordinates on click
      if (LobbyScene.DEBUG_MODE && this.debugCoordText) {
        const x = Math.round(pointer.x);
        const y = Math.round(pointer.y);
        this.debugCoordText.setText(`Clicked: x: ${x}, y: ${y}`);
        console.log(`Clicked coordinates: x: ${x}, y: ${y}`);
      }

      if (!this.localPlayer) return;

      // Check if tapping an interactive object
      const hitObject = this.interactiveObjects.find((obj) => {
        const bounds = obj.getBounds();
        return bounds.contains(pointer.x, pointer.y);
      });

      if (hitObject) {
        // Interact with object
        this.socket.emit('cc:interact', { objectId: hitObject.objectId });
        hitObject.highlight();
      } else {
        // Throttle movement updates to reduce network traffic
        const now = Date.now();
        if (now - this.lastMoveTime < LobbyScene.MOVE_THROTTLE_MS) {
          // Still move locally for responsiveness, just don't emit
          this.localPlayer.moveToPoint(pointer.x, pointer.y);
          return;
        }
        this.lastMoveTime = now;

        // Move to tap position
        this.localPlayer.moveToPoint(pointer.x, pointer.y);
        this.socket.emit('cc:move', { x: pointer.x, y: pointer.y });
      }
    });
  }

  update(time: number, delta: number) {
    // Update local player
    this.localPlayer?.update(delta);

    // Update remote players (interpolation)
    this.remotePlayers.forEach((remote) => remote.update(delta));
  }

  private showWaitingOverlay(playerCount: number) {
    if (this.waitingOverlay) return;

    this.waitingOverlay = this.add.container(400, 300);
    this.waitingOverlay.setDepth(1000);

    // Dark background
    const bg = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.8);
    this.waitingOverlay.add(bg);

    // Title
    const title = this.add.text(0, -100, '🕹️ READY TO PLAY!', {
      fontSize: '36px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.waitingOverlay.add(title);

    // Waiting text
    this.waitingText = this.add.text(0, -30, `${playerCount} player${playerCount !== 1 ? 's' : ''} ready`, {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.waitingOverlay.add(this.waitingText);

    // Info text
    const info = this.add.text(0, 30, 'Waiting for host to start...', {
      fontSize: '20px',
      color: '#fbbf24',
    }).setOrigin(0.5);
    this.waitingOverlay.add(info);

    // Dots animation - store reference for cleanup
    let dots = 0;
    this.waitingDotsTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        if (info.active) {
          dots = (dots + 1) % 4;
          info.setText('Waiting for host to start' + '.'.repeat(dots));
        }
      },
      loop: true,
    });

    // Cancel button
    const cancelBg = this.add.rectangle(0, 120, 180, 50, 0xef4444);
    cancelBg.setStrokeStyle(2, 0xffffff);
    cancelBg.setInteractive({ useHandCursor: true });

    const cancelText = this.add.text(0, 120, 'Leave Queue', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.waitingOverlay.add([cancelBg, cancelText]);

    cancelBg.on('pointerdown', () => {
      this.socket.emit('game:leave-queue');
      this.hideWaitingOverlay();
    });

    cancelBg.on('pointerover', () => cancelBg.setFillStyle(0xdc2626));
    cancelBg.on('pointerout', () => cancelBg.setFillStyle(0xef4444));
  }

  private updateWaitingOverlay(playerCount: number) {
    if (this.waitingText) {
      this.waitingText.setText(`${playerCount} player${playerCount !== 1 ? 's' : ''} ready`);
    }
  }

  private hideWaitingOverlay() {
    // Clean up timer to prevent memory leak
    if (this.waitingDotsTimer) {
      this.waitingDotsTimer.destroy();
      this.waitingDotsTimer = undefined;
    }
    if (this.waitingOverlay) {
      this.waitingOverlay.destroy();
      this.waitingOverlay = undefined;
      this.waitingText = undefined;
    }
  }

  private showGameSelector() {
    if (this.gameSelectOverlay) return;

    this.gameSelectOverlay = this.add.container(400, 300);
    this.gameSelectOverlay.setDepth(1000);

    // Dark background
    const bg = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.85);
    bg.setInteractive(); // Block clicks through
    this.gameSelectOverlay.add(bg);

    // Title
    const title = this.add.text(0, -120, '🕹️ SELECT A GAME', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.gameSelectOverlay.add(title);

    // Board Rush button
    const boardBg = this.add.rectangle(-100, 20, 150, 150, 0xf3f4f6);
    boardBg.setStrokeStyle(3, 0xdc2626);
    boardBg.setInteractive({ useHandCursor: true });

    const boardEmoji = this.add.text(-100, 0, '🎮', {
      fontSize: '64px',
    }).setOrigin(0.5);

    const boardLabel = this.add.text(-100, 60, 'Board Rush', {
      fontSize: '16px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.gameSelectOverlay.add([boardBg, boardEmoji, boardLabel]);

    boardBg.on('pointerover', () => boardBg.setFillStyle(0xdc2626));
    boardBg.on('pointerout', () => boardBg.setFillStyle(0xf3f4f6));
    boardBg.on('pointerdown', () => {
      this.hideGameSelector();
      this.socket.emit('game:join-queue', { gameType: 'board-game' });
    });

    // Caption Contest button
    const captionBg = this.add.rectangle(100, 20, 150, 150, 0xf3f4f6);
    captionBg.setStrokeStyle(3, 0xdc2626);
    captionBg.setInteractive({ useHandCursor: true });

    const captionEmoji = this.add.text(100, 0, '📸', {
      fontSize: '64px',
    }).setOrigin(0.5);

    const captionLabel = this.add.text(100, 60, 'Caption Contest', {
      fontSize: '16px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.gameSelectOverlay.add([captionBg, captionEmoji, captionLabel]);

    captionBg.on('pointerover', () => captionBg.setFillStyle(0xdc2626));
    captionBg.on('pointerout', () => captionBg.setFillStyle(0xf3f4f6));
    captionBg.on('pointerdown', () => {
      this.hideGameSelector();
      this.socket.emit('game:join-queue', { gameType: 'caption-contest' });
    });

    // Cancel button
    const cancelBg = this.add.rectangle(0, 150, 120, 40, 0x6b7280);
    cancelBg.setInteractive({ useHandCursor: true });

    const cancelText = this.add.text(0, 150, 'Cancel', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.gameSelectOverlay.add([cancelBg, cancelText]);

    cancelBg.on('pointerover', () => cancelBg.setFillStyle(0x4b5563));
    cancelBg.on('pointerout', () => cancelBg.setFillStyle(0x6b7280));
    cancelBg.on('pointerdown', () => this.hideGameSelector());
  }

  private hideGameSelector() {
    if (this.gameSelectOverlay) {
      this.gameSelectOverlay.destroy();
      this.gameSelectOverlay = undefined;
    }
  }

  private showConstructionMessage(message: string, label?: string) {
    // Hide any existing construction message
    this.hideConstructionMessage();

    this.constructionOverlay = this.add.container(400, 300);
    this.constructionOverlay.setDepth(1000);

    // Semi-transparent background
    const bg = this.add.rectangle(0, 0, 350, 150, 0x000000, 0.85);
    bg.setStrokeStyle(3, 0xfbbf24);
    this.constructionOverlay.add(bg);

    // Construction icon
    const icon = this.add.text(0, -35, '🚧', {
      fontSize: '48px',
    }).setOrigin(0.5);
    this.constructionOverlay.add(icon);

    // Message text
    const text = this.add.text(0, 25, message, {
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 300 },
    }).setOrigin(0.5);
    this.constructionOverlay.add(text);

    // Auto-hide after 2 seconds
    this.time.delayedCall(2000, () => {
      this.hideConstructionMessage();
    });

    // Also allow tap to dismiss
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.hideConstructionMessage());
  }

  private hideConstructionMessage() {
    if (this.constructionOverlay) {
      this.constructionOverlay.destroy();
      this.constructionOverlay = undefined;
    }
  }

  /**
   * Transition to a different zone with Club Penguin-style fade effect
   */
  private transitionToZone(targetZone: string) {
    // Fade out to black
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Request zone change from server
      this.socket.emit('cc:change-zone', { targetZone });
    });
  }
}
