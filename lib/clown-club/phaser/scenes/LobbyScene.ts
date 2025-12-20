import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { Player } from '../entities/Player';
import { RemotePlayer } from '../entities/RemotePlayer';
import { InteractiveObject } from '../entities/InteractiveObject';
import { GameInfo, InteractionResult, GameStartedData } from '../../types';
import { gameEvents } from '../../gameEvents';

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

  constructor() {
    super('LobbyScene');
  }

  create() {
    // Get socket and player data from registry
    this.socket = this.registry.get('socket');
    this.playerId = this.registry.get('playerId');
    const playerName = this.registry.get('playerName');

    // Create ground (simple colored rect for now)
    this.createBackground();

    // Setup socket listeners
    this.setupSocketListeners();

    // Setup input
    this.setupInput();

    // Request world state from server (scene is now ready to receive it)
    this.socket.emit('cc:request-state');
  }

  private createBackground() {
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
      if (result.success && result.action === 'launch-game') {
        // Join the game queue (host will start when ready)
        this.socket.emit('game:join-queue', { gameType: 'board-game' });
      }
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

      // Switch to appropriate game scene - use launch() to keep LobbyScene alive but paused
      // Players always see mobile controller (isHost: false) - the TV spectator shows the board
      if (gameData.gameType === 'board-game') {
        this.scene.pause();
        this.scene.launch('BoardGameScene', { isHost: false });
      }
      // Add more game types here as needed
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
      color: '#00ff00',
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

    // Dots animation
    let dots = 0;
    this.time.addEvent({
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
    if (this.waitingOverlay) {
      this.waitingOverlay.destroy();
      this.waitingOverlay = undefined;
      this.waitingText = undefined;
    }
  }
}
