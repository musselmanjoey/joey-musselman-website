import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';

/**
 * AboutYouScene - Player mobile view for "How Well Do You Know Me?" game
 *
 * Everyone answers simultaneously. MC's answer is the "correct" one.
 * Phases: lobby → answering (everyone) → reveal → round-summary → game-over
 */

interface Question {
  id: string;
  type: string;
  prompt: string;
  options?: string[];
}

interface PhaseData {
  phase: string;
  question?: Question;
  questionNumber?: number;
  totalQuestions?: number;
  mainCharacterId?: string;
  mainCharacterName?: string;
  mainCharacterAnswer?: string;
  timer?: number;
  scores?: Array<{ id: string; name: string; score: number; isMainCharacter: boolean }>;
  isLastQuestion?: boolean;
  winner?: { id: string; name: string; score: number };
  finalScores?: Array<{ id: string; name: string; score: number; isMainCharacter: boolean }>;
  players?: Array<{ id: string; name: string }>;
  guesses?: Array<{ playerId: string; playerName: string; guess: string }>;
  matches?: string[];
  approvedGuesses?: string[];
}

interface GameState {
  gameType: string;
  phase: string;
  isMainCharacter: boolean;
  mainCharacterId?: string;
  mainCharacterName?: string;
  question?: Question;
  questionNumber?: number;
  totalQuestions?: number;
  timer?: number;
  hasAnswered?: boolean;
  myScore?: number;
  mainCharacterAnswer?: string;
  myAnswer?: string;
  wasCorrect?: boolean;
  scores?: Array<{ id: string; name: string; score: number; isMainCharacter: boolean }>;
  players?: Array<{ id: string; name: string }>;
}

const COLORS = {
  background: 0xffffff,
  panel: 0xf3f4f6,
  accent: 0xdc2626,
  danger: 0xef4444,
  success: 0x22c55e,
  gold: 0xfbbf24,
  text: 0x171717,
  muted: 0x6b7280,
  border: 0xe5e7eb,
};

export class AboutYouScene extends Phaser.Scene {
  private socket!: Socket;
  private playerId!: string;
  private playerName!: string;

  // State
  private phase: string = 'lobby';
  private isMainCharacter: boolean = false;
  private mainCharacterName: string = '';
  private questionNumber: number = 1;
  private totalQuestions: number = 8;
  private myScore: number = 0;
  private hasAnswered: boolean = false;
  private timer: number = 0;

  // UI Elements
  private headerContainer!: Phaser.GameObjects.Container;
  private questionText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timerBg!: Phaser.GameObjects.Arc;

  private contentContainer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;

  private inputContainer!: Phaser.GameObjects.Container;
  private answerInput?: Phaser.GameObjects.DOMElement;
  private submitButton!: Phaser.GameObjects.Container;

  private resultContainer!: Phaser.GameObjects.Container;
  private summaryContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('AboutYouScene');
  }

  create() {
    this.socket = this.registry.get('socket');
    this.playerId = this.registry.get('playerId');
    this.playerName = this.registry.get('playerName') || 'Player';

    if (!this.socket) {
      this.add.text(400, 300, 'Connection error', { fontSize: '24px', color: '#ff0000' }).setOrigin(0.5);
      return;
    }

    // Reset state
    this.phase = 'lobby';
    this.isMainCharacter = false;
    this.hasAnswered = false;

    this.createUI();
    this.setupSocketListeners();
    this.socket.emit('game:request-state');
  }

  private createUI() {
    // Background
    this.add.rectangle(400, 300, 800, 600, COLORS.background);

    // Header - compact for mobile
    this.createHeader();

    // Content area - higher up to make room for big input
    this.contentContainer = this.add.container(400, 180);

    // Status text - lower position
    this.statusText = this.add.text(400, 560, '', {
      fontSize: '20px',
      color: '#6b7280',
      align: 'center',
      wordWrap: { width: 700 },
    }).setOrigin(0.5);

    // Input area
    this.createInputUI();

    // Result area - centered on screen
    this.resultContainer = this.add.container(400, 300);
    this.resultContainer.setVisible(false);

    // Summary area - centered on screen
    this.summaryContainer = this.add.container(400, 300);
    this.summaryContainer.setVisible(false);

    // Leave button - bottom
    this.createButton(400, 570, 'Leave Game', () => {
      this.socket.emit('game:leave');
    }, COLORS.danger, 160, 44, '16px');
  }

  private createHeader() {
    this.headerContainer = this.add.container(400, 50);

    // Question progress - left
    this.questionText = this.add.text(-360, 0, '', {
      fontSize: '22px',
      color: '#dc2626',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // Score - right
    this.scoreText = this.add.text(360, 0, '', {
      fontSize: '20px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // Timer (circular) - center, bigger
    this.timerBg = this.add.circle(0, 0, 38, COLORS.panel);
    this.timerText = this.add.text(0, 0, '', {
      fontSize: '28px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.headerContainer.add([this.questionText, this.scoreText, this.timerBg, this.timerText]);
  }

  private createInputUI() {
    this.inputContainer = this.add.container(400, 420);

    // Full-width, tall textarea for easy mobile input
    const inputHtml = `
      <textarea
        id="answer-input"
        placeholder="Type your answer..."
        maxlength="200"
        style="
          width: 700px;
          height: 140px;
          padding: 20px;
          font-size: 24px;
          border-radius: 20px;
          border: 4px solid #dc2626;
          background: #ffffff;
          color: #171717;
          resize: none;
          outline: none;
          font-family: inherit;
          -webkit-appearance: none;
          box-sizing: border-box;
        "
      ></textarea>
    `;
    this.answerInput = this.add.dom(0, -70).createFromHTML(inputHtml);

    // Big, easy-to-tap submit button
    this.submitButton = this.createButton(0, 70, 'SUBMIT', () => {
      const textarea = document.getElementById('answer-input') as HTMLTextAreaElement;
      if (textarea && textarea.value.trim()) {
        this.socket.emit('ay:submit-answer', { answer: textarea.value.trim() });
        this.hasAnswered = true;
        this.showSubmittedState();
      }
    }, COLORS.accent, 700, 80, '28px');

    this.inputContainer.add([this.answerInput, this.submitButton]);
    this.inputContainer.setVisible(false);
  }

  private createButton(
    x: number, y: number, text: string, onClick: () => void,
    color: number, width: number, height: number, fontSize: string = '18px'
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, width, height, color)
      .setStrokeStyle(2, 0x171717, 0.15)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => bg.setAlpha(0.85));
    bg.on('pointerout', () => bg.setAlpha(1));
    bg.on('pointerdown', onClick);

    return container;
  }

  private setupSocketListeners() {
    // Phase changes
    this.socket.on('ay:phase-changed', (data: PhaseData) => {
      this.handlePhaseChange(data);
    });

    // Timer updates
    this.socket.on('ay:timer', (data: { secondsLeft: number }) => {
      this.updateTimer(data.secondsLeft);
    });

    // Answer received (progress update)
    this.socket.on('ay:answer-received', (data: { totalAnswers: number; totalPlayers: number }) => {
      if (this.hasAnswered) {
        this.statusText.setText(`${data.totalAnswers}/${data.totalPlayers} answered`);
      }
    });

    // Game state (for rejoins)
    this.socket.on('game:state', (state: GameState) => {
      if (state.gameType !== 'about-you') return;
      this.isMainCharacter = state.isMainCharacter;
      this.mainCharacterName = state.mainCharacterName || '';
      this.questionNumber = state.questionNumber || 1;
      this.totalQuestions = state.totalQuestions || 8;
      this.myScore = state.myScore || 0;
      this.hasAnswered = state.hasAnswered || false;
      this.updateHeader();

      this.handlePhaseChange({
        phase: state.phase,
        question: state.question,
        questionNumber: state.questionNumber,
        totalQuestions: state.totalQuestions,
        mainCharacterId: state.mainCharacterId,
        mainCharacterName: state.mainCharacterName,
        timer: state.timer,
        scores: state.scores,
        players: state.players,
      });
    });

    // Game ended
    this.socket.on('game:ended', () => this.returnToLobby());
    this.socket.on('game:left', () => this.returnToLobby());
  }

  private handlePhaseChange(data: PhaseData) {
    this.phase = data.phase;

    if (data.mainCharacterName) {
      this.mainCharacterName = data.mainCharacterName;
    }
    if (data.mainCharacterId) {
      this.isMainCharacter = data.mainCharacterId === this.playerId;
    }
    if (data.questionNumber) {
      this.questionNumber = data.questionNumber;
    }
    if (data.totalQuestions) {
      this.totalQuestions = data.totalQuestions;
    }

    this.updateHeader();
    this.hideAllContainers();

    switch (data.phase) {
      case 'lobby':
        this.showLobby(data);
        break;
      case 'answering':
        this.showAnswering(data);
        break;
      case 'reveal':
        this.showReveal(data);
        break;
      case 'round-summary':
        this.showRoundSummary(data);
        break;
      case 'game-over':
        this.showGameOver(data);
        break;
    }
  }

  private hideAllContainers() {
    this.inputContainer.setVisible(false);
    if (this.answerInput) {
      this.answerInput.setVisible(false);
    }
    this.resultContainer.setVisible(false);
    this.resultContainer.removeAll(true);
    this.summaryContainer.setVisible(false);
    this.summaryContainer.removeAll(true);
    this.contentContainer.removeAll(true);
  }

  private updateHeader() {
    if (this.phase === 'lobby') {
      this.questionText.setText('');
      this.scoreText.setText('');
    } else {
      this.questionText.setText(`Q${this.questionNumber}/${this.totalQuestions}`);
      if (this.isMainCharacter) {
        this.scoreText.setText('⭐ Main Character');
        this.scoreText.setColor('#fbbf24');
      } else {
        this.scoreText.setText(`Score: ${this.myScore}`);
        this.scoreText.setColor('#22c55e');
      }
    }
  }

  private updateTimer(seconds: number) {
    this.timer = seconds;
    this.timerText.setText(seconds.toString());

    if (seconds <= 10 && seconds > 0) {
      this.timerBg.setFillStyle(COLORS.danger);
      this.tweens.add({
        targets: [this.timerBg, this.timerText],
        scale: { from: 1, to: 1.15 },
        duration: 150,
        yoyo: true,
      });
    } else {
      this.timerBg.setFillStyle(COLORS.panel);
    }
  }

  // ============ PHASE DISPLAYS ============

  private showLobby(data: PhaseData) {
    this.timerText.setText('');

    if (this.isMainCharacter) {
      const star = this.add.text(0, -60, '⭐', { fontSize: '80px' }).setOrigin(0.5);

      const title = this.add.text(0, 40, "You're the\nMain Character!", {
        fontSize: '36px',
        color: '#fbbf24',
        fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5);

      const subtitle = this.add.text(0, 130, 'Answer honestly.\nEveryone will try to\nmatch your answers!', {
        fontSize: '22px',
        color: '#171717',
        align: 'center',
      }).setOrigin(0.5);

      this.contentContainer.add([star, title, subtitle]);
    } else if (data.mainCharacterName) {
      const title = this.add.text(0, -20, `${data.mainCharacterName}`, {
        fontSize: '42px',
        color: '#fbbf24',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const subtitle = this.add.text(0, 40, 'is the Main Character', {
        fontSize: '26px',
        color: '#171717',
      }).setOrigin(0.5);

      const hint = this.add.text(0, 100, 'Try to guess their answers!', {
        fontSize: '22px',
        color: '#6b7280',
      }).setOrigin(0.5);

      this.contentContainer.add([title, subtitle, hint]);
    } else {
      const waiting = this.add.text(0, 40, 'Waiting for\nMain Character\nto be selected...', {
        fontSize: '28px',
        color: '#6b7280',
        align: 'center',
      }).setOrigin(0.5);

      this.contentContainer.add(waiting);
    }

    this.statusText.setText('Waiting for game to start...');
  }

  private showAnswering(data: PhaseData) {
    this.hasAnswered = false;

    if (data.timer) {
      this.updateTimer(data.timer);
    }

    // Question prompt - big and prominent
    const questionPrompt = data.question?.prompt || 'Question loading...';
    const questionDisplay = this.add.text(0, -60, questionPrompt, {
      fontSize: '32px',
      color: '#171717',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 720 },
    }).setOrigin(0.5);

    this.contentContainer.add(questionDisplay);

    // Show role hint - larger
    if (this.isMainCharacter) {
      const hint = this.add.text(0, 30, '⭐ Answer honestly!', {
        fontSize: '22px',
        color: '#fbbf24',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.contentContainer.add(hint);
    } else {
      const hint = this.add.text(0, 30, `What will ${this.mainCharacterName} say?`, {
        fontSize: '22px',
        color: '#6b7280',
      }).setOrigin(0.5);
      this.contentContainer.add(hint);
    }

    // Clear and show input
    const textarea = document.getElementById('answer-input') as HTMLTextAreaElement;
    if (textarea) textarea.value = '';

    this.inputContainer.setVisible(true);
    if (this.answerInput) {
      this.answerInput.setVisible(true);
    }
    this.statusText.setText('');
  }

  private showSubmittedState() {
    this.inputContainer.setVisible(false);
    if (this.answerInput) {
      this.answerInput.setVisible(false);
    }

    // Big checkmark in the center of where input was
    const check = this.add.text(400, 380, '✓', {
      fontSize: '120px',
      color: '#22c55e',
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: check,
      scale: { from: 0, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.statusText.setText('Answer submitted! Waiting for others...');
  }

  private showReveal(data: PhaseData) {
    this.timerText.setText('');
    this.resultContainer.removeAll(true);

    // MC's answer - prominent display
    const answerLabel = this.add.text(0, -160, `${this.mainCharacterName}'s answer:`, {
      fontSize: '22px',
      color: '#6b7280',
    }).setOrigin(0.5);

    const answerBg = this.add.rectangle(0, -90, 700, 90, COLORS.gold)
      .setStrokeStyle(4, 0x171717, 0.15);

    const answerText = this.add.text(0, -90, `"${data.mainCharacterAnswer || ''}"`, {
      fontSize: '28px',
      color: '#171717',
      fontStyle: 'bold',
      wordWrap: { width: 660 },
      align: 'center',
    }).setOrigin(0.5);

    this.resultContainer.add([answerLabel, answerBg, answerText]);

    // Show player's result (not for MC)
    if (!this.isMainCharacter) {
      const myGuess = data.guesses?.find(g => g.playerId === this.playerId);
      const wasCorrect = data.matches?.includes(this.playerId) || data.approvedGuesses?.includes(this.playerId);

      const resultY = 60;

      const resultBg = this.add.rectangle(0, resultY, 700, 140, wasCorrect ? COLORS.success : COLORS.panel)
        .setStrokeStyle(4, wasCorrect ? COLORS.success : COLORS.border);

      const resultTitle = this.add.text(0, resultY - 40, wasCorrect ? '✓ Correct!' : '✗ Not quite', {
        fontSize: '36px',
        color: wasCorrect ? '#ffffff' : '#171717',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const guessLabel = this.add.text(0, resultY + 10, 'Your guess:', {
        fontSize: '18px',
        color: wasCorrect ? 'rgba(255,255,255,0.8)' : '#6b7280',
      }).setOrigin(0.5);

      const guessText = this.add.text(0, resultY + 40, `"${myGuess?.guess || 'No answer'}"`, {
        fontSize: '22px',
        color: wasCorrect ? '#ffffff' : '#171717',
        wordWrap: { width: 660 },
        align: 'center',
      }).setOrigin(0.5);

      this.resultContainer.add([resultBg, resultTitle, guessLabel, guessText]);

      if (wasCorrect) {
        this.myScore++;
        this.updateHeader();
      }
    } else {
      // MC sees how many matched
      const correctCount = data.matches?.length || 0;
      const totalGuessers = data.guesses?.length || 0;

      const statsText = this.add.text(0, 70, `${correctCount} of ${totalGuessers} matched!`, {
        fontSize: '32px',
        color: '#171717',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.resultContainer.add(statsText);
    }

    this.resultContainer.setVisible(true);
    this.statusText.setText('Waiting for next question...');
  }

  private showRoundSummary(data: PhaseData) {
    this.summaryContainer.removeAll(true);

    const title = this.add.text(0, -160, `Question ${data.questionNumber} Complete!`, {
      fontSize: '32px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.summaryContainer.add(title);

    // Scores (excluding MC)
    if (data.scores) {
      const guessers = data.scores.filter(s => !s.isMainCharacter);

      guessers.slice(0, 5).forEach((entry, i) => {
        const y = -80 + (i * 54);
        const isMe = entry.id === this.playerId;

        const rowBg = this.add.rectangle(0, y, 600, 48, isMe ? 0xfef3c7 : COLORS.panel)
          .setStrokeStyle(isMe ? 3 : 2, isMe ? COLORS.gold : COLORS.border);

        const rank = this.add.text(-260, y, `${i + 1}.`, {
          fontSize: '24px',
          color: isMe ? '#fbbf24' : '#6b7280',
          fontStyle: 'bold',
        }).setOrigin(0, 0.5);

        const name = this.add.text(-220, y, entry.name, {
          fontSize: '24px',
          color: '#171717',
          fontStyle: isMe ? 'bold' : 'normal',
        }).setOrigin(0, 0.5);

        const score = this.add.text(260, y, entry.score.toString(), {
          fontSize: '28px',
          color: '#22c55e',
          fontStyle: 'bold',
        }).setOrigin(1, 0.5);

        this.summaryContainer.add([rowBg, rank, name, score]);
      });
    }

    this.summaryContainer.setVisible(true);
    this.statusText.setText('Waiting for next question...');
    this.timerText.setText('');
  }

  private showGameOver(data: PhaseData) {
    this.summaryContainer.removeAll(true);

    const trophy = this.add.text(0, -140, '🏆', { fontSize: '80px' }).setOrigin(0.5);

    const title = this.add.text(0, -50, 'GAME OVER!', {
      fontSize: '42px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, 10, `Who knows ${data.mainCharacterName} best?`, {
      fontSize: '22px',
      color: '#6b7280',
    }).setOrigin(0.5);

    const winnerName = this.add.text(0, 70, data.winner?.name || 'Nobody', {
      fontSize: '36px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const winnerScore = this.add.text(0, 120, `${data.winner?.score || 0} correct`, {
      fontSize: '24px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.summaryContainer.add([trophy, title, subtitle, winnerName, winnerScore]);
    this.summaryContainer.setVisible(true);
    this.statusText.setText('Returning to lobby...');
    this.timerText.setText('');
  }

  // ============ HELPERS ============

  private returnToLobby() {
    this.cleanupSocketListeners();
    this.scene.stop();
    this.scene.resume('LobbyScene');
  }

  private cleanupSocketListeners() {
    this.socket.off('ay:phase-changed');
    this.socket.off('ay:timer');
    this.socket.off('ay:answer-received');
    this.socket.off('game:state');
    this.socket.off('game:ended');
    this.socket.off('game:left');
  }

  shutdown() {
    this.cleanupSocketListeners();
  }
}
