import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';

interface PlayerInfo {
  id: string;
  name: string;
}

export class HostLobbyScene extends Phaser.Scene {
  private socket!: Socket;
  private players: PlayerInfo[] = [];
  private playerListContainer!: Phaser.GameObjects.Container;
  private waitingText!: Phaser.GameObjects.Text;

  constructor() {
    super('HostLobbyScene');
  }

  create() {
    this.socket = this.registry.get('socket');
    this.players = [];

    console.log('[HostLobby] Creating scene, socket:', !!this.socket);

    // Background
    this.add.rectangle(640, 360, 1280, 720, 0xffffff);

    // Title
    this.add.text(640, 80, '🎪 CLOWN CLUB 🎪', {
      fontSize: '64px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(640, 150, 'Waiting for players to join...', {
      fontSize: '28px',
      color: '#dc2626',
    }).setOrigin(0.5);

    // Join instructions
    this.add.text(640, 220, 'Join at: clown.club/LOBBY', {
      fontSize: '36px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Player list container
    this.playerListContainer = this.add.container(640, 380);

    // Waiting animation text
    this.waitingText = this.add.text(640, 650, 'Waiting for a player to start a game...', {
      fontSize: '24px',
      color: '#6b7280',
    }).setOrigin(0.5);

    // Animate waiting text
    this.tweens.add({
      targets: this.waitingText,
      alpha: { from: 1, to: 0.5 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    // Setup socket listeners
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    // Spectator state update
    this.socket.on('cc:spectator-state', (data: { players: PlayerInfo[] }) => {
      this.players = data.players;
      this.updatePlayerList();
    });

    // Player joined
    this.socket.on('cc:player-joined', (data: { playerId: string; playerName: string }) => {
      this.players.push({ id: data.playerId, name: data.playerName });
      this.updatePlayerList();
      this.showJoinAnimation(data.playerName);
    });

    // Player left
    this.socket.on('cc:player-left', (data: { playerId: string }) => {
      this.players = this.players.filter(p => p.id !== data.playerId);
      this.updatePlayerList();
    });

    // Game started - switch to game scene
    this.socket.on('game:started', (data: { gameType: string; gameName: string }) => {
      console.log('[Host] Game started:', data);
      this.scene.start('HostBoardGameScene');
    });
  }

  private updatePlayerList() {
    this.playerListContainer.removeAll(true);

    if (this.players.length === 0) {
      const emptyText = this.add.text(0, 0, 'No players yet...', {
        fontSize: '24px',
        color: '#6b7280',
      }).setOrigin(0.5);
      this.playerListContainer.add(emptyText);
      return;
    }

    // Grid layout for players
    const cols = 4;
    const cellWidth = 280;
    const cellHeight = 80;
    const startX = -((Math.min(this.players.length, cols) - 1) * cellWidth) / 2;

    this.players.forEach((player, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = startX + col * cellWidth;
      const y = row * cellHeight;

      // Player card
      const card = this.add.rectangle(x, y, 250, 60, 0xf3f4f6);
      card.setStrokeStyle(2, 0xdc2626);

      // Player emoji avatar
      const avatar = this.add.text(x - 90, y, '🤡', {
        fontSize: '32px',
      }).setOrigin(0.5);

      // Player name
      const name = this.add.text(x + 10, y, player.name, {
        fontSize: '22px',
        color: '#171717',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.playerListContainer.add([card, avatar, name]);
    });

    // Update waiting text
    if (this.players.length >= 1) {
      this.waitingText.setText(`${this.players.length} player${this.players.length > 1 ? 's' : ''} ready! Waiting for someone to start a game...`);
    }
  }

  private showJoinAnimation(playerName: string) {
    const joinText = this.add.text(640, 500, `${playerName} joined!`, {
      fontSize: '32px',
      color: '#4ade80',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: joinText,
      alpha: { from: 0, to: 1 },
      y: { from: 520, to: 480 },
      duration: 500,
      onComplete: () => {
        this.tweens.add({
          targets: joinText,
          alpha: 0,
          delay: 1000,
          duration: 500,
          onComplete: () => joinText.destroy(),
        });
      },
    });
  }

  shutdown() {
    this.socket.off('cc:spectator-state');
    this.socket.off('cc:player-joined');
    this.socket.off('cc:player-left');
    this.socket.off('game:started');
  }
}
