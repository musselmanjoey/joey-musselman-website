import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { MultipleChoice } from '../ui';

/**
 * AboutYouScene - Player mobile view for "How Well Do You Know Me?" game
 *
 * Everyone answers simultaneously. MC's answer is the "correct" one.
 * Phases: lobby → answering (everyone) → reveal → round-summary → game-over
 */

interface ChoiceOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  type: 'free' | 'multiple';
  prompt: string;
  options?: ChoiceOption[];
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
  timerBg: 0x1f2937,
};

// Portrait dimensions for game scenes (mobile-optimized)
const GAME_WIDTH = 400;
const GAME_HEIGHT = 700;

// Original world dimensions to restore on exit
const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;

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

  // UI Elements - Jackbox style
  private timerContainer!: Phaser.GameObjects.Container;
  private timerBg!: Phaser.GameObjects.Arc;
  private timerText!: Phaser.GameObjects.Text;

  // Corner badges
  private progressBadge!: Phaser.GameObjects.Container;
  private scoreBadge!: Phaser.GameObjects.Container;
  private progressText!: Phaser.GameObjects.Text;
  private scoreValueText!: Phaser.GameObjects.Text;

  private contentContainer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;

  private inputContainer!: Phaser.GameObjects.Container;
  private answerInput?: Phaser.GameObjects.DOMElement;
  private submitButton!: Phaser.GameObjects.Container;
  private multipleChoice?: MultipleChoice;

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
      this.add.text(200, 350, 'Connection error', { fontSize: '24px', color: '#ff0000' }).setOrigin(0.5);
      return;
    }

    // Resize to portrait mode for better mobile experience
    this.scale.resize(GAME_WIDTH, GAME_HEIGHT);

    // Reset state
    this.phase = 'lobby';
    this.isMainCharacter = false;
    this.hasAnswered = false;

    this.createUI();
    this.setupSocketListeners();
    this.socket.emit('game:request-state');
  }

  private createUI() {
    // Background - full portrait canvas
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);

    // Corner badges (small, unobtrusive)
    this.createCornerBadges();

    // Timer container (HERO - centered, prominent, LARGE for accessibility)
    this.timerContainer = this.add.container(GAME_WIDTH / 2, 70);
    this.timerBg = this.add.circle(0, 0, 50, COLORS.timerBg);
    this.timerText = this.add.text(0, 0, '', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.timerContainer.add([this.timerBg, this.timerText]);
    this.timerContainer.setVisible(false);

    // Content area - positioned for question display
    this.contentContainer = this.add.container(GAME_WIDTH / 2, 200);

    // Status text at bottom
    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, '', {
      fontSize: '18px',
      color: '#9ca3af',
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 40 },
    }).setOrigin(0.5);

    // Input area - positioned for thumb reach
    this.createInputUI();

    // Result area
    this.resultContainer = this.add.container(GAME_WIDTH / 2, 320);
    this.resultContainer.setVisible(false);

    // Summary area
    this.summaryContainer = this.add.container(GAME_WIDTH / 2, 350);
    this.summaryContainer.setVisible(false);

    // Leave button - small, bottom corner
    this.createButton(GAME_WIDTH - 70, GAME_HEIGHT - 50, 'Leave', () => {
      this.socket.emit('game:leave');
    }, COLORS.danger, 100, 36, '14px');
  }

  private createCornerBadges() {
    const pad = 12;

    // Progress badge (top-left) - "1/8"
    this.progressBadge = this.add.container(pad, pad);
    const progBg = this.add.rectangle(0, 0, 55, 26, COLORS.panel, 0.9).setOrigin(0, 0);
    this.progressText = this.add.text(27, 13, '', {
      fontSize: '13px',
      color: '#6b7280',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.progressBadge.add([progBg, this.progressText]);
    this.progressBadge.setVisible(false);

    // Score badge (top-right)
    this.scoreBadge = this.add.container(GAME_WIDTH - pad, pad);
    const scoreBg = this.add.rectangle(0, 0, 60, 26, COLORS.success, 0.9).setOrigin(1, 0);
    this.scoreValueText = this.add.text(-30, 13, '', {
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scoreBadge.add([scoreBg, this.scoreValueText]);
    this.scoreBadge.setVisible(false);
  }

  private createInputUI() {
    // Position input area in lower portion of screen for thumb reach
    this.inputContainer = this.add.container(GAME_WIDTH / 2, 480);

    const inputWidth = GAME_WIDTH - 40; // 20px padding each side

    // Large textarea for mobile - bigger text for accessibility
    const inputHtml = `
      <textarea
        id="answer-input"
        placeholder="Type your answer..."
        maxlength="200"
        style="
          width: ${inputWidth}px;
          height: 120px;
          padding: 16px;
          font-size: 22px;
          border-radius: 16px;
          border: 3px solid #dc2626;
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
    this.answerInput = this.add.dom(0, -60).createFromHTML(inputHtml);

    // Full-width submit button - big and easy to tap
    this.submitButton = this.createButton(0, 40, 'SUBMIT', () => {
      const textarea = document.getElementById('answer-input') as HTMLTextAreaElement;
      if (textarea && textarea.value.trim()) {
        this.socket.emit('ay:submit-answer', { answer: textarea.value.trim() });
        this.hasAnswered = true;
        this.showSubmittedState();
      }
    }, COLORS.accent, inputWidth, 70, '28px');

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

    this.hideAllContainers();
    this.updateBadges();

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
    this.timerContainer.setVisible(false);
    this.progressBadge.setVisible(false);
    this.scoreBadge.setVisible(false);
    this.inputContainer.setVisible(false);
    if (this.answerInput) {
      this.answerInput.setVisible(false);
    }
    // Clean up multiple choice
    if (this.multipleChoice) {
      this.multipleChoice.destroy();
      this.multipleChoice = undefined;
    }
    this.resultContainer.setVisible(false);
    this.resultContainer.removeAll(true);
    this.summaryContainer.setVisible(false);
    this.summaryContainer.removeAll(true);
    this.contentContainer.removeAll(true);
    this.statusText.setText('');
  }

  private updateBadges() {
    // Only show badges during gameplay (not lobby or game-over)
    if (this.phase === 'lobby' || this.phase === 'game-over') {
      return;
    }

    // Progress badge
    this.progressText.setText(`${this.questionNumber}/${this.totalQuestions}`);
    this.progressBadge.setVisible(true);

    // Score badge (only for guessers)
    if (!this.isMainCharacter) {
      this.scoreValueText.setText(`${this.myScore} pts`);
      this.scoreBadge.setVisible(true);
    }
  }

  private updateTimer(seconds: number) {
    this.timer = seconds;
    this.timerText.setText(seconds.toString());
    this.timerContainer.setVisible(true);

    // Color code timer based on urgency
    if (seconds <= 10 && seconds > 0) {
      this.timerBg.setFillStyle(COLORS.danger);
      this.tweens.add({
        targets: this.timerContainer,
        scale: { from: 1, to: 1.1 },
        duration: 150,
        yoyo: true,
      });
    } else if (seconds <= 30) {
      this.timerBg.setFillStyle(COLORS.gold);
    } else {
      this.timerBg.setFillStyle(COLORS.timerBg);
    }
  }

  // ============ PHASE DISPLAYS ============

  private showLobby(data: PhaseData) {
    // Center content for lobby
    this.contentContainer.setY(320);

    if (this.isMainCharacter) {
      const star = this.add.text(0, -100, '⭐', { fontSize: '80px' }).setOrigin(0.5);
      const title = this.add.text(0, 20, "You're the\nMain Character!", {
        fontSize: '36px',
        color: '#fbbf24',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 10,
      }).setOrigin(0.5);
      const subtitle = this.add.text(0, 130, 'Answer honestly.\nOthers will try to match!', {
        fontSize: '20px',
        color: '#6b7280',
        align: 'center',
        lineSpacing: 6,
      }).setOrigin(0.5);
      this.contentContainer.add([star, title, subtitle]);
    } else if (data.mainCharacterName) {
      const label = this.add.text(0, -60, 'Main Character', {
        fontSize: '18px',
        color: '#6b7280',
      }).setOrigin(0.5);
      const title = this.add.text(0, 0, data.mainCharacterName, {
        fontSize: '48px',
        color: '#fbbf24',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const hint = this.add.text(0, 80, 'Try to match their answers!', {
        fontSize: '22px',
        color: '#6b7280',
      }).setOrigin(0.5);
      this.contentContainer.add([label, title, hint]);
    } else {
      const waiting = this.add.text(0, 0, 'Waiting for host\nto select\nMain Character...', {
        fontSize: '26px',
        color: '#9ca3af',
        align: 'center',
        lineSpacing: 10,
      }).setOrigin(0.5);
      this.contentContainer.add(waiting);
    }

    this.statusText.setText('Game starting soon...');
  }

  private showAnswering(data: PhaseData) {
    this.hasAnswered = false;

    // Position content container for question display
    this.contentContainer.setY(200);

    if (data.timer) {
      this.updateTimer(data.timer);
    }

    // Question prompt - LARGE and prominent for accessibility
    const questionPrompt = data.question?.prompt || 'Question loading...';
    const questionDisplay = this.add.text(0, 0, questionPrompt, {
      fontSize: '28px',
      color: '#171717',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 40 },
      lineSpacing: 8,
    }).setOrigin(0.5);

    this.contentContainer.add(questionDisplay);

    // Role hint below question
    const hintY = 70;
    if (this.isMainCharacter) {
      const hint = this.add.text(0, hintY, '⭐ Answer honestly!', {
        fontSize: '20px',
        color: '#fbbf24',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.contentContainer.add(hint);
    } else {
      const hint = this.add.text(0, hintY, `What will ${this.mainCharacterName} say?`, {
        fontSize: '18px',
        color: '#9ca3af',
      }).setOrigin(0.5);
      this.contentContainer.add(hint);
    }

    // Show appropriate input based on question type
    if (data.question?.type === 'multiple' && data.question.options) {
      this.showMultipleChoiceInput(data.question.options);
    } else {
      this.showFreeTextInput();
    }
  }

  private showFreeTextInput() {
    // Clear and show text input
    const textarea = document.getElementById('answer-input') as HTMLTextAreaElement;
    if (textarea) textarea.value = '';

    this.inputContainer.setVisible(true);
    if (this.answerInput) {
      this.answerInput.setVisible(true);
    }
    this.submitButton.setVisible(true);

    // Hide multiple choice if it exists
    if (this.multipleChoice) {
      this.multipleChoice.setVisible(false);
    }
  }

  private showMultipleChoiceInput(options: ChoiceOption[]) {
    // Hide text input
    this.inputContainer.setVisible(false);
    if (this.answerInput) {
      this.answerInput.setVisible(false);
    }

    // Destroy previous multiple choice if exists
    if (this.multipleChoice) {
      this.multipleChoice.destroy();
    }

    // Create multiple choice component - big buttons for accessibility
    this.multipleChoice = new MultipleChoice(this, GAME_WIDTH / 2, 380, {
      options,
      width: GAME_WIDTH - 40,
      height: 60,
      spacing: 12,
      fontSize: '20px',
      showLabels: true,
      onSelect: (optionId: string) => {
        this.socket.emit('ay:submit-answer', { answer: optionId });
        this.hasAnswered = true;
        this.multipleChoice?.setDisabled(true);
        this.showSubmittedState();
      },
    });
  }

  private showSubmittedState() {
    this.inputContainer.setVisible(false);
    if (this.answerInput) {
      this.answerInput.setVisible(false);
    }

    // Big checkmark - add to contentContainer so it gets cleaned up on phase change
    const check = this.add.text(0, 150, '✓', {
      fontSize: '100px',
      color: '#22c55e',
    }).setOrigin(0.5).setScale(0);

    this.contentContainer.add(check);

    this.tweens.add({
      targets: check,
      scale: { from: 0, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.statusText.setText('Answer submitted! Waiting for others...');
  }

  private showReveal(data: PhaseData) {
    this.timerContainer.setVisible(false);
    this.resultContainer.removeAll(true);
    this.resultContainer.setY(280);

    const contentWidth = GAME_WIDTH - 40;

    // MC's answer - hero element
    const answerLabel = this.add.text(0, -120, `${this.mainCharacterName}'s answer`, {
      fontSize: '18px',
      color: '#6b7280',
    }).setOrigin(0.5);

    const answerBg = this.add.rectangle(0, -50, contentWidth, 90, COLORS.gold);

    const answerText = this.add.text(0, -50, data.mainCharacterAnswer || '', {
      fontSize: '26px',
      color: '#171717',
      fontStyle: 'bold',
      wordWrap: { width: contentWidth - 20 },
      align: 'center',
    }).setOrigin(0.5);

    this.resultContainer.add([answerLabel, answerBg, answerText]);

    // Player result (for guesser)
    if (!this.isMainCharacter) {
      const myGuess = data.guesses?.find(g => g.playerId === this.playerId);
      const wasCorrect = data.matches?.includes(this.playerId) || data.approvedGuesses?.includes(this.playerId);

      const resultY = 80;

      const resultBg = this.add.rectangle(0, resultY, contentWidth, 120, wasCorrect ? COLORS.success : COLORS.panel);

      const resultIcon = this.add.text(0, resultY - 30, wasCorrect ? '✓' : '✗', {
        fontSize: '40px',
        color: wasCorrect ? '#ffffff' : '#6b7280',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const resultLabel = this.add.text(0, resultY + 10, wasCorrect ? 'You matched!' : 'Your guess:', {
        fontSize: '16px',
        color: wasCorrect ? 'rgba(255,255,255,0.8)' : '#6b7280',
      }).setOrigin(0.5);

      const guessText = this.add.text(0, resultY + 40, myGuess?.guess || 'No answer', {
        fontSize: '20px',
        color: wasCorrect ? '#ffffff' : '#171717',
        wordWrap: { width: contentWidth - 20 },
        align: 'center',
      }).setOrigin(0.5);

      this.resultContainer.add([resultBg, resultIcon, resultLabel, guessText]);

      if (wasCorrect) {
        this.myScore++;
        this.updateBadges();
      }
    } else {
      // MC sees match count
      const correctCount = data.matches?.length || 0;
      const totalGuessers = data.guesses?.length || 0;

      const statsText = this.add.text(0, 80, `${correctCount} of ${totalGuessers} matched!`, {
        fontSize: '32px',
        color: '#171717',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.resultContainer.add(statsText);
    }

    this.resultContainer.setVisible(true);
    this.statusText.setText('Waiting for host...');
  }

  private showRoundSummary(data: PhaseData) {
    this.summaryContainer.removeAll(true);
    this.summaryContainer.setY(300);

    const contentWidth = GAME_WIDTH - 40;

    const title = this.add.text(0, -150, `Question ${data.questionNumber}`, {
      fontSize: '32px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -110, 'Complete!', {
      fontSize: '20px',
      color: '#6b7280',
    }).setOrigin(0.5);

    this.summaryContainer.add([title, subtitle]);

    // Scores (excluding MC)
    if (data.scores) {
      const guessers = data.scores.filter(s => !s.isMainCharacter);

      guessers.slice(0, 5).forEach((entry, i) => {
        const y = -50 + (i * 55);
        const isMe = entry.id === this.playerId;

        const rowBg = this.add.rectangle(0, y, contentWidth, 48, isMe ? 0xfef3c7 : COLORS.panel);

        const rank = this.add.text(-contentWidth/2 + 20, y, `${i + 1}`, {
          fontSize: '20px',
          color: '#9ca3af',
          fontStyle: 'bold',
        }).setOrigin(0, 0.5);

        const name = this.add.text(-contentWidth/2 + 50, y, entry.name, {
          fontSize: '22px',
          color: '#171717',
          fontStyle: isMe ? 'bold' : 'normal',
        }).setOrigin(0, 0.5);

        const score = this.add.text(contentWidth/2 - 20, y, `${entry.score}`, {
          fontSize: '24px',
          color: '#22c55e',
          fontStyle: 'bold',
        }).setOrigin(1, 0.5);

        this.summaryContainer.add([rowBg, rank, name, score]);
      });
    }

    this.summaryContainer.setVisible(true);
    this.statusText.setText('Next question coming...');
  }

  private showGameOver(data: PhaseData) {
    this.summaryContainer.removeAll(true);
    // Center in portrait canvas
    this.summaryContainer.setY(320);

    const contentWidth = GAME_WIDTH - 40;

    // Trophy - big and prominent
    const trophy = this.add.text(0, -160, '🏆', { fontSize: '80px' }).setOrigin(0.5);

    const title = this.add.text(0, -60, 'GAME OVER', {
      fontSize: '36px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -15, `Who knows ${data.mainCharacterName} best?`, {
      fontSize: '18px',
      color: '#6b7280',
    }).setOrigin(0.5);

    // Winner highlight box
    const winnerBg = this.add.rectangle(0, 70, contentWidth, 100, COLORS.gold, 0.2);

    const winnerName = this.add.text(0, 50, data.winner?.name || 'Nobody', {
      fontSize: '42px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const winnerScore = this.add.text(0, 100, `${data.winner?.score || 0} correct`, {
      fontSize: '24px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.summaryContainer.add([trophy, title, subtitle, winnerBg, winnerName, winnerScore]);

    // Show final scores if available
    if (data.finalScores && data.finalScores.length > 1) {
      const guessers = data.finalScores.filter(s => !s.isMainCharacter);
      const otherPlayers = guessers.slice(1, 4); // Top 2-4 runners up

      otherPlayers.forEach((entry, i) => {
        const y = 170 + (i * 45);
        const rowBg = this.add.rectangle(0, y, contentWidth - 40, 40, COLORS.panel);
        const rank = this.add.text(-contentWidth/2 + 40, y, `${i + 2}`, {
          fontSize: '18px',
          color: '#9ca3af',
          fontStyle: 'bold',
        }).setOrigin(0, 0.5);
        const name = this.add.text(-contentWidth/2 + 70, y, entry.name, {
          fontSize: '20px',
          color: '#171717',
        }).setOrigin(0, 0.5);
        const score = this.add.text(contentWidth/2 - 40, y, `${entry.score}`, {
          fontSize: '20px',
          color: '#22c55e',
          fontStyle: 'bold',
        }).setOrigin(1, 0.5);
        this.summaryContainer.add([rowBg, rank, name, score]);
      });
    }

    this.summaryContainer.setVisible(true);
    this.statusText.setText('Thanks for playing!');
  }

  // ============ HELPERS ============

  private returnToLobby() {
    this.cleanupSocketListeners();
    // Resize back to world dimensions before returning
    this.scale.resize(WORLD_WIDTH, WORLD_HEIGHT);
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
