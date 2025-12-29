import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { Player } from '../entities/Player';
import { RemotePlayer } from '../entities/RemotePlayer';
import { InteractiveObject } from '../entities/InteractiveObject';
import { InteractionResult } from '../../types';
import { gameEvents } from '../../gameEvents';
import { RecordsTheme } from '../ThemeLoader';
import { createRecordStoreBackground } from '../WorldRenderer';

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
  private recordsTheme?: RecordsTheme;
  private backgroundContainer?: Phaser.GameObjects.Container;

  constructor() {
    super('RecordStoreScene');
  }

  create() {
    // Get socket and player data from registry
    this.socket = this.registry.get('socket');
    this.playerId = this.registry.get('playerId');

    // Get theme info from registry
    this.recordsTheme = this.registry.get('recordsTheme');

    // Create background container
    this.backgroundContainer = this.add.container(0, 0);
    this.backgroundContainer.setDepth(-100);

    // Create record store background using shared WorldRenderer
    createRecordStoreBackground(this, this.backgroundContainer, {
      width: 800,
      height: 600,
    }, this.recordsTheme);

    // Now playing display at top
    this.createNowPlayingDisplay();

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
