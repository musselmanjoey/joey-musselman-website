import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { Player } from '../entities/Player';
import { RemotePlayer } from '../entities/RemotePlayer';
import { InteractiveObject } from '../entities/InteractiveObject';
import { InteractionResult, GameStartedData } from '../../types';
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
  gameType?: string;
  label?: string;
}

interface WorldState {
  zoneId: string;
  zoneName: string;
  players: PlayerData[];
  objects: ObjectData[];
}

export class GamesRoomScene extends Phaser.Scene {
  private socket!: Socket;
  private playerId!: string;
  private localPlayer?: Player;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private interactiveObjects: InteractiveObject[] = [];
  private boundSocketListeners: Map<string, (...args: unknown[]) => void> = new Map();
  private waitingOverlay?: Phaser.GameObjects.Container;
  private waitingText?: Phaser.GameObjects.Text;
  private lastMoveTime: number = 0;
  private static readonly MOVE_THROTTLE_MS = 100;

  constructor() {
    super('GamesRoomScene');
  }

  create() {
    // Get socket and player data from registry
    this.socket = this.registry.get('socket');
    this.playerId = this.registry.get('playerId');

    // Create games room background
    this.createBackground();

    // Setup socket listeners
    this.setupSocketListeners();

    // Setup input
    this.setupInput();

    // Register cleanup on scene shutdown/sleep
    this.events.once('shutdown', () => this.cleanup());
    this.events.once('sleep', () => this.cleanup());

    // Request current zone state
    this.socket.emit('cc:request-state');

    // Fade in from black (coming from zone transition)
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private cleanup() {
    this.cleanupSocketListeners();
    this.hideWaitingOverlay();
  }

  private createBackground() {
    const width = 800;
    const height = 600;

    // Dark arcade room background
    const bg = this.add.graphics();
    bg.setDepth(-100);

    // Floor - dark purple/blue arcade carpet
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRect(0, 0, width, height);

    // Add some neon accent lines
    bg.lineStyle(3, 0xff00ff, 0.5);
    bg.lineBetween(0, height - 100, width, height - 100);

    bg.lineStyle(2, 0x00ffff, 0.3);
    bg.lineBetween(0, 150, width, 150);

    // Wall at top
    bg.fillStyle(0x0f0f1a, 1);
    bg.fillRect(0, 0, width, 150);

    // Arcade room title
    const title = this.add.text(width / 2, 80, 'GAMES ROOM', {
      fontSize: '48px',
      color: '#ff00ff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    title.setDepth(-90);

    // Add glow effect to title
    title.setShadow(0, 0, '#ff00ff', 10, true, true);

    // Add "EXIT" sign above door area (left side)
    const exitSign = this.add.text(100, 350, 'EXIT', {
      fontSize: '20px',
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 },
    });
    exitSign.setOrigin(0.5);
    exitSign.setDepth(-80);
  }

  private setupSocketListeners() {
    const addListener = (event: string, handler: (...args: unknown[]) => void) => {
      this.boundSocketListeners.set(event, handler);
      this.socket.on(event, handler);
    };

    // World state received
    addListener('cc:world-state', (data: unknown) => {
      const state = data as WorldState;
      this.loadWorldState(state);
    });

    // Player joined zone
    addListener('cc:player-joined', (data: unknown) => {
      const playerData = data as PlayerData;
      if (playerData.id !== this.playerId) {
        this.addRemotePlayer(playerData);
      }
    });

    // Player left zone
    addListener('cc:player-left', (data: unknown) => {
      const { playerId } = data as { playerId: string };
      const remote = this.remotePlayers.get(playerId);
      if (remote) {
        remote.destroy();
        this.remotePlayers.delete(playerId);
      }
    });

    // Player moved
    addListener('cc:player-moved', (data: unknown) => {
      const { playerId, x, y } = data as { playerId: string; x: number; y: number };
      if (playerId === this.playerId) {
        // Server reconciliation if needed
      } else {
        const remote = this.remotePlayers.get(playerId);
        remote?.moveToPoint(x, y);
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

    // Chat message
    addListener('cc:chat-message', (data: unknown) => {
      const { playerId, message } = data as { playerId: string; message: string };
      if (playerId === this.playerId) {
        this.localPlayer?.showChatBubble(message);
      } else {
        const remote = this.remotePlayers.get(playerId);
        remote?.showChatBubble(message);
      }
    });

    // Interaction result
    addListener('cc:interaction-result', (data: unknown) => {
      const result = data as InteractionResult;
      if (result.success) {
        if (result.action === 'zone-change' && result.targetZone) {
          this.transitionToZone(result.targetZone);
        } else if (result.action === 'launch-game' && result.gameType) {
          // Direct join queue for the specific game
          this.socket.emit('game:join-queue', { gameType: result.gameType });
        }
      }
    });

    // Zone changed
    addListener('cc:zone-changed', (data: unknown) => {
      const { zoneId } = data as { zoneId: string };
      if (zoneId === 'lobby') {
        // Clean up before switching scenes
        this.cleanupSocketListeners();
        this.scene.start('LobbyScene');
      }
    });

    // Game queue events
    addListener('game:queue-joined', (data: unknown) => {
      const { totalPlayers } = data as { position: number; totalPlayers: number };
      this.showWaitingOverlay(totalPlayers);
    });

    addListener('game:queue-update', (data: unknown) => {
      const { count } = data as { count: number };
      if (count > 0 && this.waitingOverlay) {
        this.updateWaitingOverlay(count);
      }
    });

    addListener('game:queue-left', () => {
      this.hideWaitingOverlay();
    });

    // Game started
    addListener('game:started', (data: unknown) => {
      const gameData = data as GameStartedData;
      this.hideWaitingOverlay();
      gameEvents.emit('game-started', gameData);

      // Launch game scene
      if (gameData.gameType === 'board-game') {
        this.scene.pause();
        this.scene.launch('BoardGameScene', { isHost: false });
      } else if (gameData.gameType === 'caption-contest') {
        this.scene.pause();
        this.scene.launch('CaptionContestScene');
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

  private cleanupSocketListeners() {
    for (const [event, handler] of this.boundSocketListeners.entries()) {
      this.socket.off(event, handler);
    }
    this.boundSocketListeners.clear();
  }

  private setupInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.localPlayer) return;

      // Check if clicked on an interactive object
      const clickedObject = this.interactiveObjects.find(obj => {
        const bounds = obj.getBounds();
        return bounds.contains(pointer.x, pointer.y);
      });

      if (clickedObject) {
        clickedObject.highlight();
        this.socket.emit('cc:interact', { objectId: clickedObject.objectId });
      } else {
        // Throttle movement updates to reduce network traffic
        const now = Date.now();
        if (now - this.lastMoveTime < GamesRoomScene.MOVE_THROTTLE_MS) {
          // Still move locally for responsiveness, just don't emit
          this.localPlayer.moveToPoint(pointer.x, pointer.y);
          return;
        }
        this.lastMoveTime = now;

        // Move player
        this.localPlayer.moveToPoint(pointer.x, pointer.y);
        this.socket.emit('cc:move', { x: pointer.x, y: pointer.y });
      }
    });
  }

  private loadWorldState(state: WorldState) {
    // Clear existing objects
    this.interactiveObjects.forEach(obj => obj.destroy());
    this.interactiveObjects = [];

    // Clear existing remote players
    this.remotePlayers.forEach(player => player.destroy());
    this.remotePlayers.clear();

    // Destroy local player if exists
    if (this.localPlayer) {
      this.localPlayer.destroy();
      this.localPlayer = undefined;
    }

    // Create interactive objects
    for (const objData of state.objects) {
      const obj = new InteractiveObject(
        this,
        objData.x,
        objData.y,
        objData.emoji,
        objData.id
      );

      // Add label for arcade cabinets
      if (objData.label) {
        const label = this.add.text(objData.x, objData.y + 40, objData.label, {
          fontSize: '14px',
          color: '#ffffff',
          backgroundColor: '#000000aa',
          padding: { x: 6, y: 3 },
        });
        label.setOrigin(0.5);
        label.setDepth(obj.depth - 1);
      }

      this.interactiveObjects.push(obj);
    }

    // Create players
    for (const playerData of state.players) {
      if (playerData.id === this.playerId) {
        // Local player
        const playerName = this.registry.get('playerName') || playerData.name;
        this.localPlayer = new Player(
          this,
          playerData.x,
          playerData.y,
          playerName,
          playerData.character,
          playerData.isVIP
        );
      } else {
        // Remote player
        this.addRemotePlayer(playerData);
      }
    }
  }

  private addRemotePlayer(data: PlayerData) {
    const remote = new RemotePlayer(
      this,
      data.x,
      data.y,
      data.name,
      data.character,
      data.isVIP
    );
    this.remotePlayers.set(data.id, remote);
  }

  private transitionToZone(targetZone: string) {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.socket.emit('cc:change-zone', { targetZone });
    });
  }

  private showWaitingOverlay(playerCount: number) {
    if (this.waitingOverlay) return;

    this.waitingOverlay = this.add.container(400, 300);
    this.waitingOverlay.setDepth(1000);

    const bg = this.add.rectangle(0, 0, 300, 150, 0x000000, 0.8);
    bg.setStrokeStyle(2, 0xff00ff);

    this.waitingText = this.add.text(0, -20, `Waiting for players...\n${playerCount} in queue`, {
      fontSize: '20px',
      color: '#ffffff',
      align: 'center',
    });
    this.waitingText.setOrigin(0.5);

    const cancelBtn = this.add.rectangle(0, 50, 100, 35, 0xdc2626);
    cancelBtn.setInteractive({ useHandCursor: true });
    const cancelText = this.add.text(0, 50, 'Leave', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    cancelBtn.on('pointerdown', () => {
      this.socket.emit('game:leave-queue');
    });

    this.waitingOverlay.add([bg, this.waitingText, cancelBtn, cancelText]);
  }

  private updateWaitingOverlay(count: number) {
    if (this.waitingText) {
      this.waitingText.setText(`Waiting for players...\n${count} in queue`);
    }
  }

  private hideWaitingOverlay() {
    if (this.waitingOverlay) {
      this.waitingOverlay.destroy();
      this.waitingOverlay = undefined;
      this.waitingText = undefined;
    }
  }

  update(_time: number, delta: number) {
    this.localPlayer?.update(delta);
    this.remotePlayers.forEach(player => player.update(delta));
  }

  /**
   * Called when returning from a game
   */
  resumeFromGame() {
    this.scene.resume();
    this.setupSocketListeners();
    this.socket.emit('cc:request-state');
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  shutdown() {
    this.cleanupSocketListeners();
  }
}
