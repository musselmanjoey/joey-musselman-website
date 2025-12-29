import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { Player } from '../entities/Player';
import { RemotePlayer } from '../entities/RemotePlayer';
import { InteractiveObject } from '../entities/InteractiveObject';
import { InteractionResult } from '../../types';
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
  label?: string;
  width?: number;
  height?: number;
}

interface WorldState {
  zoneId: string;
  zoneName: string;
  players: PlayerData[];
  objects: ObjectData[];
}

interface PlaybackState {
  isPlaying: boolean;
  track?: {
    id: string;
    name: string;
    artist: string;
    album: string;
    albumArt?: string;
    duration: number;
    progress: number;
  };
}

// Set to true to enable coordinate debugging
const DEBUG_COORDINATES = false;

export class RecordStoreScene extends Phaser.Scene {
  private socket!: Socket;
  private playerId!: string;
  private localPlayer?: Player;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private interactiveObjects: InteractiveObject[] = [];
  private boundSocketListeners: Map<string, (...args: unknown[]) => void> = new Map();
  private lastMoveTime: number = 0;
  private static readonly MOVE_THROTTLE_MS = 100;
  private debugText?: Phaser.GameObjects.Text;
  private debugMarkers: Phaser.GameObjects.Container[] = [];
  private nowPlayingContainer?: Phaser.GameObjects.Container;
  private playbackState: PlaybackState = { isPlaying: false };

  constructor() {
    super('RecordStoreScene');
  }

  create() {
    // Get socket and player data from registry
    this.socket = this.registry.get('socket');
    this.playerId = this.registry.get('playerId');

    // Create record store background
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

    // Request playback state
    this.socket.emit('rs:request-state');

    // Fade in from black (coming from zone transition)
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // Debug coordinate mode
    if (DEBUG_COORDINATES) {
      this.setupDebugMode();
    }
  }

  private setupDebugMode() {
    this.debugText = this.add.text(10, 10, 'DEBUG MODE: Click to mark coordinates', {
      fontSize: '14px',
      color: '#00ff00',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    });
    this.debugText.setDepth(1000);
    this.debugText.setScrollFactor(0);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const x = Math.round(pointer.x);
      const y = Math.round(pointer.y);
      this.debugText?.setText(`Click: (${x}, ${y})\nMarkers: ${this.debugMarkers.length + 1}`);

      const marker = this.add.container(x, y);
      marker.setDepth(999);

      const cross = this.add.graphics();
      cross.lineStyle(2, 0x00ff00, 1);
      cross.lineBetween(-10, 0, 10, 0);
      cross.lineBetween(0, -10, 0, 10);
      marker.add(cross);

      const label = this.add.text(5, 5, `(${x}, ${y})`, {
        fontSize: '12px',
        color: '#00ff00',
        backgroundColor: '#000000cc',
        padding: { x: 4, y: 2 },
      });
      marker.add(label);

      this.debugMarkers.push(marker);
    });
  }

  private cleanup() {
    this.cleanupSocketListeners();
  }

  private createBackground() {
    const width = 800;
    const height = 600;

    // Record Store themed background (procedural for now)
    const backgroundContainer = this.add.container(0, 0);
    backgroundContainer.setDepth(-100);

    // Dark moody background
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    backgroundContainer.add(bg);

    // Wooden floor
    const floor = this.add.rectangle(width / 2, height - 75, width, 150, 0x8b4513);
    backgroundContainer.add(floor);

    // Floor grain lines
    const floorGraphics = this.add.graphics();
    floorGraphics.lineStyle(1, 0x6b3410, 0.3);
    for (let i = 0; i < 10; i++) {
      floorGraphics.lineBetween(0, height - 150 + i * 15, width, height - 150 + i * 15);
    }
    backgroundContainer.add(floorGraphics);

    // Back wall
    const wall = this.add.rectangle(width / 2, 200, width, 200, 0x2d2d44);
    backgroundContainer.add(wall);

    // Vinyl shelves on left side
    this.createVinylShelves(backgroundContainer, 100, 280);

    // DJ booth on right side
    this.createDJBooth(backgroundContainer, 550, 320);

    // Review board
    this.createReviewBoard(backgroundContainer, 680, 350);

    // Exit sign
    this.createExitSign(backgroundContainer, 92, 340);

    // Ambient lighting
    this.createAmbientLighting(backgroundContainer, width, height);

    // Now playing display at top
    this.createNowPlayingDisplay();
  }

  private createVinylShelves(container: Phaser.GameObjects.Container, x: number, y: number) {
    // Vinyl record display shelves
    const shelfContainer = this.add.container(x, y);

    // Shelf backing
    const backing = this.add.rectangle(0, 0, 200, 180, 0x3d3d5c);
    shelfContainer.add(backing);

    // Shelf lines
    const shelves = this.add.graphics();
    shelves.fillStyle(0x5d4e37);
    shelves.fillRect(-100, -60, 200, 8);
    shelves.fillRect(-100, 0, 200, 8);
    shelves.fillRect(-100, 60, 200, 8);
    shelfContainer.add(shelves);

    // Vinyl records on shelves (colorful spines)
    const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181, 0xaa96da];
    for (let shelf = 0; shelf < 3; shelf++) {
      for (let slot = 0; slot < 6; slot++) {
        const record = this.add.rectangle(
          -80 + slot * 28,
          -40 + shelf * 60,
          20,
          45,
          colors[(shelf * 6 + slot) % colors.length]
        );
        shelfContainer.add(record);
      }
    }

    // Label
    const label = this.add.text(0, 100, 'COLLECTION', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    shelfContainer.add(label);

    container.add(shelfContainer);
  }

  private createDJBooth(container: Phaser.GameObjects.Container, x: number, y: number) {
    const boothContainer = this.add.container(x, y);

    // DJ table
    const table = this.add.rectangle(0, 20, 160, 80, 0x2d2d44);
    boothContainer.add(table);

    // Turntables
    const leftTT = this.add.circle(-40, 10, 30, 0x1a1a2e);
    const rightTT = this.add.circle(40, 10, 30, 0x1a1a2e);
    boothContainer.add(leftTT);
    boothContainer.add(rightTT);

    // Vinyl on turntables
    const leftVinyl = this.add.circle(-40, 10, 25, 0x0a0a0a);
    const rightVinyl = this.add.circle(40, 10, 25, 0x0a0a0a);
    boothContainer.add(leftVinyl);
    boothContainer.add(rightVinyl);

    // Center labels
    const leftLabel = this.add.circle(-40, 10, 8, 0xdc2626);
    const rightLabel = this.add.circle(40, 10, 8, 0xdc2626);
    boothContainer.add(leftLabel);
    boothContainer.add(rightLabel);

    // Mixer in middle
    const mixer = this.add.rectangle(0, 10, 30, 50, 0x3d3d5c);
    boothContainer.add(mixer);

    // Label
    const label = this.add.text(0, 70, 'DJ BOOTH', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    boothContainer.add(label);

    container.add(boothContainer);
  }

  private createReviewBoard(container: Phaser.GameObjects.Container, x: number, y: number) {
    const boardContainer = this.add.container(x, y);

    // Cork board
    const board = this.add.rectangle(0, 0, 100, 120, 0xc4a35a);
    board.setStrokeStyle(4, 0x5d4e37);
    boardContainer.add(board);

    // Pinned notes
    const noteColors = [0xfff8dc, 0xffe4e1, 0xe0ffff];
    for (let i = 0; i < 3; i++) {
      const note = this.add.rectangle(-20 + i * 25, -20 + i * 15, 40, 35, noteColors[i]);
      note.setAngle(-5 + i * 5);
      boardContainer.add(note);

      // Pin
      const pin = this.add.circle(-20 + i * 25, -35 + i * 15, 4, 0xdc2626);
      boardContainer.add(pin);
    }

    // Label
    const label = this.add.text(0, 75, 'REVIEWS', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    boardContainer.add(label);

    container.add(boardContainer);
  }

  private createExitSign(container: Phaser.GameObjects.Container, x: number, y: number) {
    const exitContainer = this.add.container(x, y);

    // Exit sign
    const sign = this.add.rectangle(0, 0, 60, 25, 0x22c55e);
    exitContainer.add(sign);

    const exitText = this.add.text(0, 0, 'EXIT', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    exitContainer.add(exitText);

    // Arrow
    const arrow = this.add.text(-25, 0, '<-', {
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);
    exitContainer.add(arrow);

    container.add(exitContainer);
  }

  private createAmbientLighting(container: Phaser.GameObjects.Container, width: number, height: number) {
    // Mood lighting effects
    const lighting = this.add.graphics();

    // Warm spotlight on DJ booth
    lighting.fillStyle(0xffa500, 0.1);
    lighting.fillCircle(550, 280, 120);

    // Cool spotlight on vinyl shelves
    lighting.fillStyle(0x4ecdc4, 0.08);
    lighting.fillCircle(100, 280, 100);

    container.add(lighting);
  }

  private createNowPlayingDisplay() {
    this.nowPlayingContainer = this.add.container(400, 50);
    this.nowPlayingContainer.setDepth(100);

    // Background bar
    const bg = this.add.rectangle(0, 0, 400, 40, 0x000000, 0.7);
    bg.setStrokeStyle(1, 0xdc2626);
    this.nowPlayingContainer.add(bg);

    // Music note icon
    const icon = this.add.text(-180, 0, '🎵', { fontSize: '20px' }).setOrigin(0.5);
    this.nowPlayingContainer.add(icon);

    // Now playing text
    const text = this.add.text(0, 0, 'No music playing', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.nowPlayingContainer.add(text);
  }

  private updateNowPlaying(state: PlaybackState) {
    this.playbackState = state;

    if (!this.nowPlayingContainer) return;

    // Find and update the text
    const textObj = this.nowPlayingContainer.getAt(2) as Phaser.GameObjects.Text;
    if (state.track) {
      textObj.setText(`${state.track.name} - ${state.track.artist}`);
    } else {
      textObj.setText('No music playing');
    }
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
      if (playerId !== this.playerId) {
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
        } else if (result.action === 'browse-vinyl') {
          // Emit event to show vinyl browser overlay
          gameEvents.emit('rs:show-vinyl-browser');
        } else if (result.action === 'playback-controls') {
          // Emit event to show playback controls overlay
          gameEvents.emit('rs:show-controls');
        } else if (result.action === 'view-reviews') {
          // Emit event to show reviews panel
          gameEvents.emit('rs:show-reviews');
        }
      }
    });

    // Zone changed
    addListener('cc:zone-changed', (data: unknown) => {
      const { zoneId } = data as { zoneId: string };
      if (zoneId === 'lobby') {
        this.cleanupSocketListeners();
        this.scene.start('LobbyScene');
      } else if (zoneId === 'games') {
        this.cleanupSocketListeners();
        this.scene.start('GamesRoomScene');
      }
    });

    // Record Store specific events
    addListener('rs:state-update', (data: unknown) => {
      const state = data as PlaybackState;
      this.updateNowPlaying(state);
    });

    // Handle socket disconnect
    addListener('disconnect', () => {
      this.handleDisconnect();
    });
  }

  private handleDisconnect() {
    this.input.enabled = false;

    const overlay = this.add.container(400, 300);
    overlay.setDepth(2000);

    const bg = this.add.rectangle(0, 0, 300, 100, 0x000000, 0.9);
    const text = this.add.text(0, 0, 'Connection lost...\nReconnecting', {
      fontSize: '20px',
      color: '#ff6b6b',
      align: 'center',
    }).setOrigin(0.5);

    overlay.add([bg, text]);

    this.socket.once('connect', () => {
      overlay.destroy();
      this.input.enabled = true;
      this.socket.emit('cc:request-state');
      this.socket.emit('rs:request-state');
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
        // Throttle movement updates
        const now = Date.now();
        if (now - this.lastMoveTime < RecordStoreScene.MOVE_THROTTLE_MS) {
          this.localPlayer.moveToPoint(pointer.x, pointer.y);
          return;
        }
        this.lastMoveTime = now;

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
        objData.id,
        objData.width,
        objData.height
      );
      this.interactiveObjects.push(obj);
    }

    // Create players
    for (const playerData of state.players) {
      if (playerData.id === this.playerId) {
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

  update(_time: number, delta: number) {
    this.localPlayer?.update(delta);
    this.remotePlayers.forEach(player => player.update(delta));
  }

  shutdown() {
    this.cleanupSocketListeners();
  }
}
