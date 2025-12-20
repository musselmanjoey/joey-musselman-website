import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { BoardPosition, BoardMovement } from '../../types';

const BOARD_COLORS = {
  background: 0x1a1a2e,
  boardBg: 0x16213e,
  space: 0x0f3460,
  spaceAlt: 0x1a1a2e,
  ladder: 0x4ade80,
  chute: 0xf87171,
  text: 0xffffff,
};

interface TriviaOption {
  id: string;
  text: string;
}

export class HostBoardGameScene extends Phaser.Scene {
  private socket!: Socket;
  private playerTokens: Map<string, Phaser.GameObjects.Container> = new Map();
  private boardSpaces: Phaser.GameObjects.Rectangle[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private standingsContainer!: Phaser.GameObjects.Container;
  private triviaContainer!: Phaser.GameObjects.Container;
  private roundText!: Phaser.GameObjects.Text;
  private triviaTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('HostBoardGameScene');
  }

  create() {
    this.socket = this.registry.get('socket');
    this.playerTokens.clear();
    this.boardSpaces = [];

    console.log('[HostBoardGame] Creating scene, socket:', !!this.socket);

    // Background
    this.add.rectangle(640, 360, 1280, 720, BOARD_COLORS.background);

    // Title
    this.add.text(640, 40, '🎲 BOARD RUSH 🎲', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Round indicator
    this.roundText = this.add.text(640, 90, 'Round 1', {
      fontSize: '28px',
      color: '#60a5fa',
    }).setOrigin(0.5);

    // Create the board (larger for TV)
    this.createBoard();

    // Status text
    this.statusText = this.add.text(640, 680, 'Waiting for players to roll...', {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Standings panel on the right (shorter to make room for legend)
    this.add.rectangle(1140, 280, 240, 280, 0x16213e).setStrokeStyle(2, 0x3b82f6);
    this.add.text(1140, 155, 'STANDINGS', {
      fontSize: '24px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.standingsContainer = this.add.container(1140, 190);

    // Legend panel - chutes and ladders
    this.add.rectangle(1140, 540, 240, 200, 0x16213e).setStrokeStyle(2, 0x3b82f6);

    // Ladders
    this.add.text(1070, 455, '🪜 LADDERS', { fontSize: '14px', color: '#4ade80', fontStyle: 'bold' });
    const ladders = [[4,14], [9,22], [18,31], [28,42], [32,44]];
    ladders.forEach((l, i) => {
      this.add.text(1070, 475 + i * 16, `${l[0]} → ${l[1]}`, { fontSize: '12px', color: '#4ade80' });
    });

    // Chutes
    this.add.text(1160, 455, '🎢 CHUTES', { fontSize: '14px', color: '#f87171', fontStyle: 'bold' });
    const chutes = [[16,6], [34,24], [49,39]];
    chutes.forEach((c, i) => {
      this.add.text(1160, 475 + i * 16, `${c[0]} → ${c[1]}`, { fontSize: '12px', color: '#f87171' });
    });

    // Trivia container (hidden initially) - high depth to show above tokens
    this.triviaContainer = this.add.container(640, 400);
    this.triviaContainer.setDepth(500);
    this.triviaContainer.setVisible(false);

    // Setup socket listeners
    this.setupSocketListeners();

    // Request current game state (spectators can now get host state)
    console.log('[HostBoardGame] Requesting game state');
    this.socket.emit('game:request-state');
  }

  private createBoard() {
    const startX = 120;
    const startY = 580;
    const spaceSize = 65;
    const spacesPerRow = 10;
    const gap = 8;

    // Board background
    const boardWidth = spacesPerRow * (spaceSize + gap);
    const boardHeight = 5 * (spaceSize + gap);
    this.add.rectangle(
      startX + boardWidth / 2 - spaceSize / 2,
      startY - boardHeight / 2 + spaceSize / 2,
      boardWidth + 40,
      boardHeight + 40,
      0x16213e
    ).setStrokeStyle(3, 0x3b82f6);

    // Create 50 spaces in a snake pattern
    for (let i = 1; i <= 50; i++) {
      const row = Math.floor((i - 1) / spacesPerRow);
      const col = (i - 1) % spacesPerRow;
      const actualCol = row % 2 === 0 ? col : (spacesPerRow - 1 - col);

      const x = startX + actualCol * (spaceSize + gap);
      const y = startY - row * (spaceSize + gap);

      const color = i % 2 === 0 ? BOARD_COLORS.space : BOARD_COLORS.spaceAlt;
      const space = this.add.rectangle(x, y, spaceSize, spaceSize, color);
      space.setStrokeStyle(2, 0x333355);
      this.boardSpaces.push(space);

      // Space number
      this.add.text(x, y, i.toString(), {
        fontSize: '18px',
        color: '#666688',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    // Mark ladders and chutes
    const ladders = [
      { start: 4, end: 14 },
      { start: 9, end: 22 },
      { start: 18, end: 31 },
      { start: 28, end: 42 },
      { start: 32, end: 44 },
    ];

    const chutes = [
      { start: 16, end: 6 },
      { start: 34, end: 24 },
      { start: 49, end: 39 },
    ];

    ladders.forEach(l => {
      if (this.boardSpaces[l.start - 1]) {
        this.boardSpaces[l.start - 1].setFillStyle(BOARD_COLORS.ladder, 0.6);
        this.add.text(
          this.boardSpaces[l.start - 1].x,
          this.boardSpaces[l.start - 1].y - 20,
          '🪜',
          { fontSize: '20px' }
        ).setOrigin(0.5);
      }
    });

    chutes.forEach(c => {
      if (this.boardSpaces[c.start - 1]) {
        this.boardSpaces[c.start - 1].setFillStyle(BOARD_COLORS.chute, 0.6);
        this.add.text(
          this.boardSpaces[c.start - 1].x,
          this.boardSpaces[c.start - 1].y - 20,
          '🎢',
          { fontSize: '20px' }
        ).setOrigin(0.5);
      }
    });

  }

  private setupSocketListeners() {
    console.log('[HostBoardGame] Setting up socket listeners');

    // Initial game state (when scene starts)
    this.socket.on('game:state', (state: {
      gameType: string;
      state: string;
      round: number;
      positions: BoardPosition[];
      standings: BoardPosition[];
    }) => {
      console.log('[HostBoardGame] Received game state:', state);
      if (state.round) {
        this.roundText.setText(`Round ${state.round}`);
      }
      if (state.positions) {
        this.updatePositions(state.positions);
      }
      if (state.standings) {
        this.updateStandings(state.standings);
      }
      // Update status based on current state
      switch (state.state) {
        case 'rolling':
          this.statusText.setText('Players rolling dice...');
          break;
        case 'moving':
          this.statusText.setText('Moving pieces...');
          break;
        case 'trivia':
          this.statusText.setText('TRIVIA TIME!');
          break;
        case 'results':
          this.statusText.setText('Round complete!');
          break;
      }
    });

    // Round started
    this.socket.on('bg:round-started', (data: { round: number; phase: string; positions: BoardPosition[] }) => {
      console.log('[HostBoardGame] Round started:', data);
      this.roundText.setText(`Round ${data.round}`);
      this.statusText.setText('Players rolling dice...');
      this.hideTrivia();
      this.updatePositions(data.positions);
    });

    // Player rolled
    this.socket.on('bg:player-rolled', (data: { playerName: string; roll: number; rollsRemaining: number }) => {
      this.statusText.setText(`${data.playerName} rolled ${data.roll}! (${data.rollsRemaining} left)`);
      this.showRollPopup(data.playerName, data.roll);
    });

    // All rolled
    this.socket.on('bg:all-rolled', (data: { countdown: number }) => {
      this.statusText.setText(`All rolled! Moving in ${data.countdown}...`);
    });

    // Movements
    this.socket.on('bg:movements', (data: { movements: BoardMovement[]; positions: BoardPosition[] }) => {
      this.statusText.setText('Moving pieces...');
      this.animateMovements(data.movements);
    });

    // Trivia question
    this.socket.on('bg:trivia-question', (data: { question: string; options: TriviaOption[]; timeLimit: number }) => {
      this.showTrivia(data.question, data.options, data.timeLimit);
    });

    // Answer received
    this.socket.on('bg:answer-received', (data: { answeredCount: number; totalPlayers: number }) => {
      this.statusText.setText(`${data.answeredCount}/${data.totalPlayers} answered`);
    });

    // Round results
    this.socket.on('bg:round-results', (data: {
      standings: BoardPosition[];
      triviaResults?: { playerName: string; correct: boolean }[];
      correctAnswer?: { text: string };
      winner?: { name: string }
    }) => {
      this.hideTrivia();
      this.updateStandings(data.standings);
      this.updatePositions(data.standings);

      if (data.correctAnswer) {
        this.showCorrectAnswer(data.correctAnswer.text);
      }

      if (data.winner) {
        this.showWinner(data.winner.name);
      } else {
        this.statusText.setText('Round complete! Next round starting...');
      }
    });

    // Game over
    this.socket.on('bg:game-over', (data: { winner: { name: string; color: string }; totalRounds: number }) => {
      this.showGameOver(data.winner.name, data.totalRounds);
    });

    // Game ended
    this.socket.on('game:ended', () => {
      this.scene.start('HostWorldScene');
    });
  }

  private updatePositions(positions: BoardPosition[]) {
    positions.forEach(pos => {
      this.updatePlayerToken(pos.playerId, pos.playerName, pos.position, pos.color);
    });
  }

  private updatePlayerToken(playerId: string, name: string, position: number, color: string) {
    let token = this.playerTokens.get(playerId);

    if (!token) {
      token = this.add.container(0, 0);
      const circle = this.add.circle(0, 0, 22, parseInt(color.replace('#', '0x')));
      circle.setStrokeStyle(3, 0xffffff);
      const initial = this.add.text(0, 0, name.charAt(0).toUpperCase(), {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      token.add([circle, initial]);
      token.setDepth(100);
      this.playerTokens.set(playerId, token);
    }

    const spaceIndex = Math.min(position - 1, this.boardSpaces.length - 1);
    const space = this.boardSpaces[spaceIndex];
    if (space) {
      const tokenCount = Array.from(this.playerTokens.values()).filter(t =>
        Math.abs(t.x - space.x) < 30 && Math.abs(t.y - space.y) < 30
      ).length;
      const offset = (tokenCount % 3 - 1) * 15;
      token.setPosition(space.x + offset, space.y + offset);
    }
  }

  private showRollPopup(playerName: string, roll: number) {
    const popup = this.add.text(640, 300, `${playerName}: 🎲 ${roll}`, {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: popup,
      alpha: 1,
      scale: { from: 0.5, to: 1.2 },
      duration: 300,
      onComplete: () => {
        this.tweens.add({
          targets: popup,
          alpha: 0,
          y: 250,
          delay: 800,
          duration: 300,
          onComplete: () => popup.destroy(),
        });
      },
    });
  }

  private animateMovements(movements: BoardMovement[]) {
    movements.forEach((move, index) => {
      const token = this.playerTokens.get(move.playerId);
      if (!token) return;

      const targetSpace = this.boardSpaces[Math.min(move.finalPosition - 1, this.boardSpaces.length - 1)];
      if (targetSpace) {
        this.tweens.add({
          targets: token,
          x: targetSpace.x,
          y: targetSpace.y,
          duration: 600,
          delay: index * 300,
          ease: 'Power2',
        });
      }

      if (move.trigger) {
        this.time.delayedCall(index * 300 + 600, () => {
          const emoji = move.trigger!.type === 'ladder' ? '🪜' : '🎢';
          const color = move.trigger!.type === 'ladder' ? '#4ade80' : '#f87171';
          const triggerText = this.add.text(640, 300,
            `${emoji} ${move.playerName}: ${move.trigger!.name}!`, {
            fontSize: '36px',
            color: color,
            fontStyle: 'bold',
          }).setOrigin(0.5);

          this.tweens.add({
            targets: triggerText,
            alpha: 0,
            y: 250,
            duration: 2000,
            onComplete: () => triggerText.destroy(),
          });
        });
      }
    });
  }

  private hideTrivia() {
    // Stop the timer if running
    if (this.triviaTimer) {
      this.triviaTimer.remove();
      this.triviaTimer = undefined;
    }
    this.triviaContainer.removeAll(true);
    this.triviaContainer.setVisible(false);
  }

  private showTrivia(question: string, options: TriviaOption[], timeLimit: number) {
    this.hideTrivia(); // Clean up any existing trivia first
    this.triviaContainer.setVisible(true);
    this.statusText.setText('TRIVIA TIME! Answer on your phones!');

    // Question background
    const bg = this.add.rectangle(0, -50, 800, 300, 0x16213e);
    bg.setStrokeStyle(3, 0xfbbf24);
    this.triviaContainer.add(bg);

    // Question text
    const questionText = this.add.text(0, -120, question, {
      fontSize: '28px',
      color: '#ffffff',
      wordWrap: { width: 700 },
      align: 'center',
    }).setOrigin(0.5);
    this.triviaContainer.add(questionText);

    // Options in 2x2 grid
    const optionColors = [0x3b82f6, 0x22c55e, 0xf59e0b, 0xef4444];
    options.forEach((opt, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = (col - 0.5) * 350;
      const y = -20 + row * 70;

      const optBg = this.add.rectangle(x, y, 320, 55, optionColors[i]);
      optBg.setStrokeStyle(2, 0xffffff);
      const letter = String.fromCharCode(65 + i);
      const optText = this.add.text(x, y, `${letter}. ${opt.text}`, {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.triviaContainer.add([optBg, optText]);
    });

    // Timer
    const timerText = this.add.text(0, 130, `${timeLimit}s`, {
      fontSize: '36px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.triviaContainer.add(timerText);

    // Countdown
    let remaining = timeLimit;
    this.triviaTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        remaining--;
        if (timerText.active) {
          timerText.setText(`${remaining}s`);
          if (remaining <= 5) {
            timerText.setColor('#ef4444');
          }
        }
      },
      repeat: timeLimit - 1,
    });
  }

  private showCorrectAnswer(answerText: string) {
    const popup = this.add.text(640, 400, `✅ Correct: ${answerText}`, {
      fontSize: '32px',
      color: '#4ade80',
      fontStyle: 'bold',
      backgroundColor: '#1a1a2e',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      alpha: 0,
      delay: 2000,
      duration: 500,
      onComplete: () => popup.destroy(),
    });
  }

  private updateStandings(standings: BoardPosition[]) {
    this.standingsContainer.removeAll(true);

    standings.forEach((player, i) => {
      const y = i * 50;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

      const dot = this.add.circle(-80, y, 12, parseInt((player.color || '#ffffff').replace('#', '0x')));
      const rank = this.add.text(-55, y, medal, { fontSize: '20px' }).setOrigin(0, 0.5);
      const name = this.add.text(-25, y, player.playerName, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      const pos = this.add.text(80, y, `${player.position}`, {
        fontSize: '18px',
        color: '#60a5fa',
      }).setOrigin(0.5);

      this.standingsContainer.add([dot, rank, name, pos]);
    });
  }

  private showWinner(winnerName: string) {
    this.statusText.setText(`🎉 ${winnerName} WINS! 🎉`);

    const winText = this.add.text(640, 360, `🏆 ${winnerName} WINS! 🏆`, {
      fontSize: '64px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: winText,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Confetti effect
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(100, 1180);
      const confetti = this.add.text(x, -50, ['🎉', '🎊', '⭐', '🌟'][i % 4], {
        fontSize: `${Phaser.Math.Between(24, 48)}px`,
      });
      this.tweens.add({
        targets: confetti,
        y: 800,
        x: x + Phaser.Math.Between(-100, 100),
        rotation: Phaser.Math.Between(-3, 3),
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 1000),
        onComplete: () => confetti.destroy(),
      });
    }
  }

  private showGameOver(winnerName: string, totalRounds: number) {
    this.showWinner(winnerName);

    this.time.delayedCall(5000, () => {
      this.statusText.setText('Game Over! Returning to lobby...');
    });
  }

  shutdown() {
    this.hideTrivia();
    this.socket.off('game:state');
    this.socket.off('bg:round-started');
    this.socket.off('bg:player-rolled');
    this.socket.off('bg:all-rolled');
    this.socket.off('bg:movements');
    this.socket.off('bg:trivia-question');
    this.socket.off('bg:answer-received');
    this.socket.off('bg:round-results');
    this.socket.off('bg:game-over');
    this.socket.off('game:ended');
    this.playerTokens.clear();
    this.boardSpaces = [];
  }
}
