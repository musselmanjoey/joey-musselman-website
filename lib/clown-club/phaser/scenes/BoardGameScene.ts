import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { BoardGameState, BoardPosition, BoardMovement } from '../../types';
import { gameEvents } from '../../gameEvents';

const BOARD_COLORS = {
  background: 0x1a1a2e,
  boardBg: 0x16213e,
  space: 0x0f3460,
  spaceAlt: 0x1a1a2e,
  ladder: 0x4ade80,
  chute: 0xf87171,
  text: 0xffffff,
};

export class BoardGameScene extends Phaser.Scene {
  private socket!: Socket;
  private playerId!: string;
  private isHost: boolean = false;
  private gameState: BoardGameState | null = null;

  // UI elements
  private statusText!: Phaser.GameObjects.Text;
  private rollButton!: Phaser.GameObjects.Container;
  private triviaContainer!: Phaser.GameObjects.Container;
  private standingsContainer!: Phaser.GameObjects.Container;
  private playerTokens: Map<string, Phaser.GameObjects.Container> = new Map();
  private boardSpaces: Phaser.GameObjects.Rectangle[] = [];

  // Player controller specific
  private myPositionText!: Phaser.GameObjects.Text;
  private rollResultText!: Phaser.GameObjects.Text;

  constructor() {
    super('BoardGameScene');
  }

  init(data: { isHost: boolean }) {
    this.isHost = data.isHost || false;
  }

  create() {
    this.socket = this.registry.get('socket');
    this.playerId = this.registry.get('playerId');

    console.log('[BoardGame] Create called, isHost:', this.isHost, 'socket:', !!this.socket, 'playerId:', this.playerId);

    // Create background
    this.add.rectangle(400, 300, 800, 600, BOARD_COLORS.background);

    if (this.isHost) {
      // HOST VIEW: Full board display for TV/laptop
      this.createHostView();
    } else {
      // PLAYER VIEW: Mobile-friendly controller
      this.createPlayerView();
    }

    // Setup socket listeners
    this.setupSocketListeners();

    // Request initial game state
    console.log('[BoardGame] Requesting game state');
    this.socket.emit('game:request-state');
  }

  private createHostView() {
    // Create game title
    this.add.text(400, 30, 'Board Rush', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Create the board
    this.createBoard();

    // Create host UI elements
    this.createHostUI();
  }

  private createPlayerView() {
    // Mobile-friendly player controller (800x600 canvas scaled with FIT mode)
    const playerName = this.registry.get('playerName') || 'Player';

    // Full-screen background
    this.add.rectangle(400, 300, 800, 600, BOARD_COLORS.background);

    // Large title
    this.add.text(400, 50, '🎲 Board Rush', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Player name
    this.add.text(400, 100, playerName, {
      fontSize: '24px',
      color: '#60a5fa',
    }).setOrigin(0.5);

    // Status text - large and centered
    this.statusText = this.add.text(400, 170, 'Waiting for game...', {
      fontSize: '22px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 700 },
    }).setOrigin(0.5);

    // My position display
    this.myPositionText = this.add.text(400, 230, 'Position: 1 / 50', {
      fontSize: '28px',
      color: '#4ade80',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Roll result display (hidden initially)
    this.rollResultText = this.add.text(400, 300, '', {
      fontSize: '64px',
    }).setOrigin(0.5);

    // Big roll button for mobile - centered and large
    this.rollButton = this.createMobileButton(400, 400, 'ROLL DICE 🎲', () => {
      this.socket.emit('bg:roll-dice');
      this.rollButton.setVisible(false);
      this.statusText.setText('Rolling...');
    }, 0x3b82f6, 300, 80);
    this.rollButton.setVisible(false);

    // Trivia container (hidden initially)
    this.triviaContainer = this.add.container(400, 380);
    this.triviaContainer.setVisible(false);

    // Leave button - smaller, at bottom
    this.createMobileButton(400, 550, 'Leave Game', () => {
      this.socket.emit('game:leave');
    }, 0xef4444, 160, 50);
  }

  private createMobileButton(
    x: number,
    y: number,
    text: string,
    callback: () => void,
    color: number = 0x3b82f6,
    width: number = 280,
    height: number = 70
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, width, height, color);
    bg.setStrokeStyle(3, 0xffffff);
    bg.setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize: height > 50 ? '28px' : '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => bg.setAlpha(0.8));
    bg.on('pointerout', () => bg.setAlpha(1));
    bg.on('pointerdown', () => {
      bg.setScale(0.95);
      callback();
    });
    bg.on('pointerup', () => bg.setScale(1));

    return container;
  }

  private createBoard() {
    const startX = 50;
    const startY = 520;
    const spaceSize = 50;
    const spacesPerRow = 10;

    // Create 50 spaces in a snake pattern
    for (let i = 1; i <= 50; i++) {
      const row = Math.floor((i - 1) / spacesPerRow);
      const col = (i - 1) % spacesPerRow;

      // Snake pattern: reverse direction on odd rows
      const actualCol = row % 2 === 0 ? col : (spacesPerRow - 1 - col);

      const x = startX + actualCol * (spaceSize + 5) + spaceSize / 2;
      const y = startY - row * (spaceSize + 5) - spaceSize / 2;

      const color = i % 2 === 0 ? BOARD_COLORS.space : BOARD_COLORS.spaceAlt;
      const space = this.add.rectangle(x, y, spaceSize, spaceSize, color);
      space.setStrokeStyle(2, 0x333355);
      this.boardSpaces.push(space);

      // Add space number
      this.add.text(x, y, i.toString(), {
        fontSize: '14px',
        color: '#888899',
      }).setOrigin(0.5);
    }

    // Mark special spaces (ladders and chutes from board config)
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
        this.boardSpaces[l.start - 1].setFillStyle(BOARD_COLORS.ladder, 0.5);
      }
    });

    chutes.forEach(c => {
      if (this.boardSpaces[c.start - 1]) {
        this.boardSpaces[c.start - 1].setFillStyle(BOARD_COLORS.chute, 0.5);
      }
    });

    // Legend
    this.add.rectangle(700, 80, 15, 15, BOARD_COLORS.ladder).setStrokeStyle(1, 0xffffff);
    this.add.text(715, 80, 'Ladder', { fontSize: '12px', color: '#4ade80' }).setOrigin(0, 0.5);

    this.add.rectangle(700, 100, 15, 15, BOARD_COLORS.chute).setStrokeStyle(1, 0xffffff);
    this.add.text(715, 100, 'Chute', { fontSize: '12px', color: '#f87171' }).setOrigin(0, 0.5);
  }

  private createHostUI() {
    // Status text
    this.statusText = this.add.text(400, 70, 'Waiting for players to roll...', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Trivia container for displaying questions on TV (hidden initially)
    this.triviaContainer = this.add.container(400, 350);
    this.triviaContainer.setVisible(false);

    // Standings container
    this.standingsContainer = this.add.container(700, 200);
    this.add.text(700, 150, 'Standings', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Host doesn't need roll button - players roll on their phones
    // Create a dummy container to avoid null errors
    this.rollButton = this.add.container(0, 0);
    this.rollButton.setVisible(false);

    // Next round button (for host to advance)
    // Will be shown after results phase
  }

  private createButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 100, 40, 0x3b82f6);
    bg.setStrokeStyle(2, 0x60a5fa);
    bg.setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => bg.setFillStyle(0x60a5fa));
    bg.on('pointerout', () => bg.setFillStyle(0x3b82f6));
    bg.on('pointerdown', callback);

    return container;
  }

  private setupSocketListeners() {
    console.log('[BoardGame] Setting up socket listeners');

    // Game state update
    // NOTE: We intentionally do NOT update this.isHost from server state.
    // isHost is set during scene init and determines the VIEW (board vs controller).
    // Phone players always get isHost=false (controller view), TV spectator gets board view.
    this.socket.on('game:state', (state: BoardGameState & { gameType: string; isHost: boolean }) => {
      console.log('[BoardGame] Received game:state, keeping isHost:', this.isHost);
      this.updateGameState(state);
    });

    // Round started
    this.socket.on('bg:round-started', (data: { round: number; phase: string; positions: BoardPosition[] }) => {
      console.log('[BoardGame] Round started:', data);
      if (this.isHost) {
        this.statusText.setText(`Round ${data.round} - Players rolling...`);
      } else {
        this.statusText.setText('Tap to roll!');
        this.rollButton.setVisible(true);
        if (this.rollResultText) {
          this.rollResultText.setText('');
        }
      }
      this.updatePositions(data.positions);
    });

    // Player rolled
    this.socket.on('bg:player-rolled', (data: { playerName: string; roll: number; rollsRemaining: number }) => {
      if (this.isHost) {
        this.statusText.setText(`${data.playerName} rolled ${data.roll}! (${data.rollsRemaining} left)`);
      }
      // Players see their own result via bg:your-roll
    });

    // Your roll result (player only)
    this.socket.on('bg:your-roll', (data: { roll: number }) => {
      this.showRollResult(data.roll);
    });

    // All rolled
    this.socket.on('bg:all-rolled', (data: { countdown: number }) => {
      this.statusText.setText(`All rolled! Moving in ${data.countdown}...`);
    });

    // Movements
    this.socket.on('bg:movements', (data: { movements: BoardMovement[]; positions: BoardPosition[] }) => {
      this.animateMovements(data.movements);
      this.updatePositions(data.positions);
    });

    // Trivia question
    this.socket.on('bg:trivia-question', (data: { question: string; options: { id: string; text: string }[]; timeLimit: number }) => {
      if (this.isHost) {
        this.showHostTrivia(data.question, data.options);
      } else {
        this.showPlayerTrivia(data);
      }
    });

    // Answer result (player only)
    this.socket.on('bg:answer-result', (data: { correct: boolean; bonusMovement?: number; newPosition?: number }) => {
      if (!this.isHost) {
        if (data.correct) {
          this.statusText.setText(`✅ Correct! +${data.bonusMovement} spaces!`);
          if (this.myPositionText && data.newPosition) {
            this.myPositionText.setText(`Position: ${data.newPosition} / 50`);
          }
        } else {
          this.statusText.setText('❌ Wrong answer!');
        }
      }
    });

    // Round results
    this.socket.on('bg:round-results', (data: { standings: BoardPosition[]; winner?: { name: string } }) => {
      this.triviaContainer.setVisible(false);

      if (this.isHost) {
        this.updateStandings(data.standings);
      } else {
        // Update player's position from standings
        const myStanding = data.standings.find(s => s.playerId === this.playerId);
        if (myStanding && this.myPositionText) {
          this.myPositionText.setText(`Position: ${myStanding.position} / 50`);
        }
      }

      if (data.winner) {
        this.statusText.setText(`🎉 ${data.winner.name} wins!`);
      } else if (this.isHost) {
        this.statusText.setText('Round complete!');
        this.showNextRoundButton();
      } else {
        this.statusText.setText('Waiting for next round...');
      }
    });

    // Game over
    this.socket.on('bg:game-over', (data: { winner: { name: string; color: string }; totalRounds: number }) => {
      if (this.isHost) {
        this.statusText.setText(`🏆 ${data.winner.name} wins in ${data.totalRounds} rounds!`);
      } else {
        const isMe = data.winner.name === this.registry.get('playerName');
        if (isMe) {
          this.statusText.setText('🏆 YOU WIN!');
        } else {
          this.statusText.setText(`${data.winner.name} wins!`);
        }
      }
    });

    // Game ended (left or closed)
    this.socket.on('game:ended', () => {
      this.returnToWorld();
    });

    this.socket.on('game:left', () => {
      this.returnToWorld();
    });
  }

  private updateGameState(state: BoardGameState) {
    this.gameState = state;

    // Update standings (host only)
    if (this.isHost && state.standings) {
      this.updateStandings(state.standings);
    }

    // Update player's position display
    if (!this.isHost && state.myPosition !== undefined) {
      this.myPositionText?.setText(`Position: ${state.myPosition} / 50`);
    }

    // Show appropriate UI based on state
    switch (state.state) {
      case 'rolling':
        if (this.isHost) {
          this.statusText.setText(`Round ${state.round || 1} - Waiting for players to roll...`);
        } else {
          this.statusText.setText('Tap to roll your dice!');
          this.rollButton.setVisible(!state.hasRolled);
          if (state.hasRolled) {
            this.statusText.setText(`You rolled ${state.myRoll}! Waiting for others...`);
          }
        }
        this.triviaContainer.setVisible(false);
        break;
      case 'moving':
        this.statusText.setText('Moving pieces...');
        this.rollButton.setVisible(false);
        break;
      case 'trivia':
        if (this.isHost) {
          // Host shows the question on TV for everyone to see
          if (state.trivia) {
            this.showHostTrivia(state.trivia.question, state.trivia.options);
          }
        } else {
          // Players see answer buttons
          if (state.trivia && !state.hasAnswered) {
            this.showPlayerTrivia({
              question: state.trivia.question,
              options: state.trivia.options,
              timeLimit: 15,
            });
          } else if (state.hasAnswered) {
            this.statusText.setText('Answer submitted! Waiting...');
            this.triviaContainer.setVisible(false);
          }
        }
        break;
      case 'results':
        this.triviaContainer.setVisible(false);
        if (this.isHost) {
          this.statusText.setText('Round complete! Starting next round...');
        }
        break;
    }
  }

  private showHostTrivia(question: string, options: { id: string; text: string }[]) {
    this.triviaContainer.removeAll(true);
    this.triviaContainer.setVisible(true);

    this.statusText.setText('TRIVIA TIME!');

    // Large question display for TV
    const questionText = this.add.text(0, -80, question, {
      fontSize: '24px',
      color: '#ffffff',
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5);
    this.triviaContainer.add(questionText);

    // Show options (display only, not interactive)
    options.forEach((opt, i) => {
      const y = -20 + i * 45;
      const optBg = this.add.rectangle(0, y, 500, 38, 0x3b82f6);
      optBg.setStrokeStyle(2, 0x60a5fa);
      const optText = this.add.text(0, y, `${String.fromCharCode(65 + i)}. ${opt.text}`, {
        fontSize: '18px',
        color: '#ffffff',
      }).setOrigin(0.5);
      this.triviaContainer.add([optBg, optText]);
    });

    // Timer hint
    const timerText = this.add.text(0, 120, 'Answer on your phones!', {
      fontSize: '16px',
      color: '#fbbf24',
    }).setOrigin(0.5);
    this.triviaContainer.add(timerText);
  }

  private updatePositions(positions: BoardPosition[]) {
    // Only host has the board with tokens
    if (!this.isHost) {
      // For players, update their own position display
      const myPos = positions.find(p => p.playerId === this.playerId);
      if (myPos && this.myPositionText) {
        this.myPositionText.setText(`Position: ${myPos.position} / 50`);
      }
      return;
    }

    positions.forEach(pos => {
      this.updatePlayerToken(pos.playerId, pos.playerName, pos.position, pos.color);
    });
  }

  private updatePlayerToken(playerId: string, name: string, position: number, color: string) {
    let token = this.playerTokens.get(playerId);

    if (!token) {
      // Create new token
      token = this.add.container(0, 0);
      const circle = this.add.circle(0, 0, 15, parseInt(color.replace('#', '0x')));
      circle.setStrokeStyle(2, 0xffffff);
      const initial = this.add.text(0, 0, name.charAt(0).toUpperCase(), {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      token.add([circle, initial]);
      this.playerTokens.set(playerId, token);
    }

    // Get target position on board
    const spaceIndex = Math.min(position - 1, this.boardSpaces.length - 1);
    const space = this.boardSpaces[spaceIndex];
    if (space) {
      // Add slight offset for multiple tokens on same space
      const offset = (this.playerTokens.size % 3 - 1) * 10;
      token.setPosition(space.x + offset, space.y);
    }
  }

  private showRollResult(roll: number) {
    if (this.isHost) {
      // Host sees it on the board - small notification
      const diceText = this.add.text(400, 300, `🎲 ${roll}`, {
        fontSize: '64px',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: diceText,
        scale: { from: 0, to: 1.5 },
        alpha: { from: 1, to: 0 },
        duration: 1500,
        onComplete: () => diceText.destroy(),
      });
    } else {
      // Player sees big result on their phone
      if (this.rollResultText) {
        this.rollResultText.setText(`🎲 ${roll}`);
        this.rollResultText.setScale(0);
        this.rollResultText.setAlpha(1);

        this.tweens.add({
          targets: this.rollResultText,
          scale: { from: 0, to: 1.2 },
          duration: 500,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: this.rollResultText,
              scale: 1,
              duration: 200,
            });
          }
        });
      }
      this.statusText.setText(`You rolled ${roll}! Waiting for others...`);
    }
  }

  private animateMovements(movements: BoardMovement[]) {
    if (!this.isHost) {
      // For players, just show their movement info
      const myMove = movements.find(m => m.playerId === this.playerId);
      if (myMove) {
        let statusMsg = `Moved to space ${myMove.finalPosition}`;
        if (myMove.trigger) {
          const emoji = myMove.trigger.type === 'ladder' ? '🪜' : '🎢';
          statusMsg += `\n${emoji} ${myMove.trigger.name}!`;
        }
        this.statusText.setText(statusMsg);
        if (this.myPositionText) {
          this.myPositionText.setText(`Position: ${myMove.finalPosition} / 50`);
        }
      }
      return;
    }

    // Host animates tokens on the board
    movements.forEach((move, index) => {
      const token = this.playerTokens.get(move.playerId);
      if (!token) return;

      // Animate to new position
      const targetSpace = this.boardSpaces[Math.min(move.finalPosition - 1, this.boardSpaces.length - 1)];
      if (targetSpace) {
        this.tweens.add({
          targets: token,
          x: targetSpace.x,
          y: targetSpace.y,
          duration: 500,
          delay: index * 200,
          ease: 'Power2',
        });
      }

      // Show trigger text if any
      if (move.trigger) {
        this.time.delayedCall(index * 200 + 500, () => {
          const emoji = move.trigger!.type === 'ladder' ? '🪜' : '🎢';
          const triggerText = this.add.text(400, 200,
            `${emoji} ${move.playerName}: ${move.trigger!.name}!`, {
            fontSize: '28px',
            color: move.trigger!.type === 'ladder' ? '#4ade80' : '#f87171',
            fontStyle: 'bold',
          }).setOrigin(0.5);

          this.tweens.add({
            targets: triggerText,
            alpha: 0,
            y: 150,
            duration: 2000,
            onComplete: () => triggerText.destroy(),
          });
        });
      }
    });
  }

  private showPlayerTrivia(data: { question: string; options: { id: string; text: string }[]; timeLimit: number }) {
    this.triviaContainer.removeAll(true);
    this.triviaContainer.setVisible(true);
    this.rollButton.setVisible(false);

    // Move trivia container higher on screen for mobile
    this.triviaContainer.setPosition(400, 320);

    this.statusText.setText('TRIVIA! Look at the TV!');

    // Don't show question on phone - it's on the TV
    // Just show big answer buttons

    // Big touch-friendly answer buttons with more space
    data.options.forEach((opt, i) => {
      const y = -100 + i * 80;

      const optBg = this.add.rectangle(0, y, 360, 65, 0x3b82f6);
      optBg.setStrokeStyle(4, 0x60a5fa);
      optBg.setInteractive({ useHandCursor: true });

      const optText = this.add.text(0, y, `${String.fromCharCode(65 + i)}. ${opt.text}`, {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        wordWrap: { width: 340 },
      }).setOrigin(0.5);

      optBg.on('pointerover', () => optBg.setAlpha(0.8));
      optBg.on('pointerout', () => optBg.setAlpha(1));
      optBg.on('pointerdown', () => {
        optBg.setScale(0.95);
        optBg.setFillStyle(0x22c55e); // Green to show selected
        this.socket.emit('bg:submit-answer', { answerId: opt.id });
        this.triviaContainer.setVisible(false);
        this.statusText.setText('Answer submitted!');
      });
      optBg.on('pointerup', () => optBg.setScale(1));

      this.triviaContainer.add([optBg, optText]);
    });
  }

  private updateStandings(standings: BoardPosition[]) {
    this.standingsContainer.removeAll(true);

    standings.forEach((player, i) => {
      const y = i * 25;
      const color = player.color || '#ffffff';

      const dot = this.add.circle(-40, y, 8, parseInt(color.replace('#', '0x')));
      const text = this.add.text(-25, y, `${i + 1}. ${player.playerName} (${player.position})`, {
        fontSize: '12px',
        color: '#ffffff',
      }).setOrigin(0, 0.5);

      this.standingsContainer.add([dot, text]);
    });
  }

  private showNextRoundButton() {
    const btn = this.createButton(400, 550, 'Next Round', () => {
      this.socket.emit('bg:next-round');
      btn.destroy();
    });
  }

  private returnToWorld() {
    // Clean up listeners
    this.socket.off('game:state');
    this.socket.off('bg:round-started');
    this.socket.off('bg:player-rolled');
    this.socket.off('bg:your-roll');
    this.socket.off('bg:all-rolled');
    this.socket.off('bg:movements');
    this.socket.off('bg:trivia-question');
    this.socket.off('bg:answer-result');
    this.socket.off('bg:round-results');
    this.socket.off('bg:game-over');
    this.socket.off('game:ended');
    this.socket.off('game:left');

    // Emit event to notify React the game ended
    gameEvents.emit('game-ended');

    // Resume LobbyScene and stop this scene
    this.scene.resume('LobbyScene');
    this.scene.stop();
  }

  destroy() {
    this.playerTokens.clear();
    this.boardSpaces = [];
  }
}
