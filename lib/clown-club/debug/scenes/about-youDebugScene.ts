import * as Phaser from 'phaser';
import { GameMockData } from '../mockData';
import { MultipleChoice } from '../../phaser/ui';

/**
 * About You Debug Scene - Matches real AboutYouScene layout
 *
 * Uses portrait mode (400x700) for mobile-optimized display.
 */

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

// Will be set dynamically based on viewport
let GAME_WIDTH = 400;
let GAME_HEIGHT = 700;

interface Question {
  id?: string;
  type?: 'free' | 'multiple';
  prompt?: string;
  options?: Array<{ id: string; text: string }>;
}

export default class AboutYouDebugScene extends Phaser.Scene {
  private mockData!: GameMockData;
  private phase: string = 'lobby';
  private role: string = 'guesser';

  // UI containers
  private timerContainer!: Phaser.GameObjects.Container;
  private contentContainer!: Phaser.GameObjects.Container;
  private inputContainer!: Phaser.GameObjects.Container;
  private resultContainer!: Phaser.GameObjects.Container;
  private summaryContainer!: Phaser.GameObjects.Container;

  // Timer elements
  private timerBg!: Phaser.GameObjects.Arc;
  private timerText!: Phaser.GameObjects.Text;

  // Corner badges
  private progressBadge!: Phaser.GameObjects.Container;
  private scoreBadge!: Phaser.GameObjects.Container;
  private progressText!: Phaser.GameObjects.Text;
  private scoreValueText!: Phaser.GameObjects.Text;

  // Status & Leave button
  private statusText!: Phaser.GameObjects.Text;
  private leaveButton!: Phaser.GameObjects.Container;

  // Multiple choice
  private multipleChoice?: MultipleChoice;

  constructor() {
    super('about-youDebugScene');
  }

  create() {
    // Use actual viewport dimensions (don't resize - causes clipping issues in debug)
    GAME_WIDTH = this.scale.width;
    GAME_HEIGHT = this.scale.height;

    this.mockData = this.registry.get('mockData') || { phase: 'lobby' };
    this.phase = this.registry.get('phase') || 'lobby';
    this.role = this.registry.get('role') || 'guesser';

    this.createUI();
    this.renderPhase();
    this.events.on('debug:update', this.handleDebugUpdate, this);
  }

  private handleDebugUpdate(data: { phase: string; role: string; mockData: GameMockData }) {
    this.mockData = data.mockData;
    this.phase = data.phase;
    this.role = data.role;
    this.renderPhase();
  }

  private createUI() {
    // Background - full portrait canvas
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);

    // Corner badges
    this.createCornerBadges();

    // Timer container (HERO - centered, prominent)
    this.timerContainer = this.add.container(GAME_WIDTH / 2, 70);
    this.timerBg = this.add.circle(0, 0, 50, COLORS.timerBg);
    this.timerText = this.add.text(0, 0, '', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.timerContainer.add([this.timerBg, this.timerText]);
    this.timerContainer.setVisible(false);

    // Content area
    this.contentContainer = this.add.container(GAME_WIDTH / 2, 200);

    // Status text at bottom (moved up for visibility)
    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 90, '', {
      fontSize: '16px',
      color: '#9ca3af',
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 60 },
    }).setOrigin(0.5);

    // Input area
    this.createInputUI();

    // Result area
    this.resultContainer = this.add.container(GAME_WIDTH / 2, 280);
    this.resultContainer.setVisible(false);

    // Summary area
    this.summaryContainer = this.add.container(GAME_WIDTH / 2, 300);
    this.summaryContainer.setVisible(false);

    // Leave button - small, bottom right (moved up for visibility)
    this.leaveButton = this.createButton(GAME_WIDTH - 60, GAME_HEIGHT - 40, 'Leave', 80, 32, COLORS.danger, '12px');
  }

  private createCornerBadges() {
    const pad = 12;

    // Progress badge (top-left)
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
    this.inputContainer = this.add.container(GAME_WIDTH / 2, 440);

    const inputWidth = GAME_WIDTH - 50;

    // Mock textarea
    const textareaBg = this.add.rectangle(0, -50, inputWidth, 100, 0xffffff)
      .setStrokeStyle(3, COLORS.accent);

    const placeholder = this.add.text(0, -50, 'Type your answer...', {
      fontSize: '20px',
      color: '#9ca3af',
    }).setOrigin(0.5);

    // Submit button
    const submitBtn = this.createButton(0, 35, 'SUBMIT', inputWidth, 60, COLORS.accent, '24px');

    this.inputContainer.add([textareaBg, placeholder, submitBtn]);
    this.inputContainer.setVisible(false);
  }

  private createButton(x: number, y: number, text: string, w: number, h: number, color: number, fontSize: string = '18px'): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, color)
      .setStrokeStyle(2, 0x171717, 0.15);

    const label = this.add.text(0, 0, text, {
      fontSize,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, label]);
    return container;
  }

  private renderPhase() {
    this.hideAllContainers();
    this.updateBadges();

    switch (this.phase) {
      case 'lobby':
        this.showLobby();
        break;
      case 'answering':
      case 'answering-mc':
        this.showAnswering();
        break;
      case 'reveal':
        this.showReveal();
        break;
      case 'round-summary':
        this.showRoundSummary();
        break;
      case 'game-over':
        this.showGameOver();
        break;
    }
  }

  private hideAllContainers() {
    this.timerContainer.setVisible(false);
    this.progressBadge.setVisible(false);
    this.scoreBadge.setVisible(false);
    this.inputContainer.setVisible(false);
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
    const data = this.mockData;

    if (this.phase === 'lobby' || this.phase === 'game-over') {
      return;
    }

    const qNum = (data.questionNumber as number) || 1;
    const qTotal = (data.totalQuestions as number) || 8;

    this.progressText.setText(`${qNum}/${qTotal}`);
    this.progressBadge.setVisible(true);

    if (!data.isMainCharacter) {
      this.scoreValueText.setText(`${data.myScore || 0} pts`);
      this.scoreBadge.setVisible(true);
    }

    if ((this.phase === 'answering' || this.phase === 'answering-mc') && data.timer) {
      this.timerText.setText(String(data.timer));
      this.timerContainer.setVisible(true);

      const time = data.timer as number;
      if (time <= 10) {
        this.timerBg.setFillStyle(COLORS.danger);
      } else if (time <= 30) {
        this.timerBg.setFillStyle(COLORS.gold);
      } else {
        this.timerBg.setFillStyle(COLORS.timerBg);
      }
    }
  }

  private showLobby() {
    const data = this.mockData;
    const mcName = data.mainCharacterName as string;

    this.contentContainer.setY(320);

    if (data.isMainCharacter) {
      const star = this.add.text(0, -100, '⭐', { fontSize: '64px' }).setOrigin(0.5);
      const title = this.add.text(0, 10, "You're the\nMain Character!", {
        fontSize: '28px',
        color: '#fbbf24',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 8,
      }).setOrigin(0.5);
      const subtitle = this.add.text(0, 110, 'Answer honestly.\nThey will guess!', {
        fontSize: '16px',
        color: '#6b7280',
        align: 'center',
        lineSpacing: 4,
      }).setOrigin(0.5);
      this.contentContainer.add([star, title, subtitle]);
    } else if (mcName) {
      const label = this.add.text(0, -60, 'Main Character', {
        fontSize: '16px',
        color: '#6b7280',
      }).setOrigin(0.5);
      const title = this.add.text(0, 0, mcName, {
        fontSize: '44px',
        color: '#fbbf24',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const hint = this.add.text(0, 80, 'Match their answers!', {
        fontSize: '20px',
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

  private showAnswering() {
    const data = this.mockData;
    const question = data.question as Question | undefined;
    const mcName = data.mainCharacterName as string;

    this.contentContainer.setY(200);

    // Question text - use tighter wordWrap to prevent edge clipping
    const questionDisplay = this.add.text(0, 0, question?.prompt || 'Question loading...', {
      fontSize: '20px',
      color: '#171717',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 100 },
      lineSpacing: 4,
    }).setOrigin(0.5);

    this.contentContainer.add(questionDisplay);

    // Role hint
    const hintY = 70;
    if (data.isMainCharacter) {
      const hint = this.add.text(0, hintY, '⭐ Answer honestly!', {
        fontSize: '20px',
        color: '#fbbf24',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.contentContainer.add(hint);
    } else {
      const hint = this.add.text(0, hintY, `What will ${mcName} say?`, {
        fontSize: '18px',
        color: '#9ca3af',
      }).setOrigin(0.5);
      this.contentContainer.add(hint);
    }

    // Show appropriate input based on question type
    if (question?.type === 'multiple' && question.options) {
      this.showMultipleChoiceInput(question.options);
    } else {
      this.inputContainer.setVisible(true);
    }
  }

  private showMultipleChoiceInput(options: Array<{ id: string; text: string }>) {
    this.inputContainer.setVisible(false);

    // Position and size to fit all 4 options in viewport
    this.multipleChoice = new MultipleChoice(this, GAME_WIDTH / 2, 310, {
      options,
      width: GAME_WIDTH - 50,
      height: 50,
      spacing: 6,
      fontSize: '16px',
      showLabels: true,
      onSelect: () => {
        // Debug mode - just show selection
      },
    });
  }

  private showReveal() {
    const data = this.mockData;
    const mcName = data.mainCharacterName as string;
    const mcAnswer = data.mainCharacterAnswer as string;
    const contentWidth = GAME_WIDTH - 40;

    this.resultContainer.setY(280);

    // MC's answer
    const answerLabel = this.add.text(0, -120, `${mcName}'s answer`, {
      fontSize: '18px',
      color: '#6b7280',
    }).setOrigin(0.5);

    const answerBg = this.add.rectangle(0, -50, contentWidth, 90, COLORS.gold);

    const answerText = this.add.text(0, -50, mcAnswer || '', {
      fontSize: '26px',
      color: '#171717',
      fontStyle: 'bold',
      wordWrap: { width: contentWidth - 20 },
      align: 'center',
    }).setOrigin(0.5);

    this.resultContainer.add([answerLabel, answerBg, answerText]);

    // Player result
    if (!data.isMainCharacter) {
      const myAnswer = data.myAnswer as string;
      const wasCorrect = data.wasCorrect as boolean;
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

      const guessText = this.add.text(0, resultY + 40, myAnswer || 'No answer', {
        fontSize: '20px',
        color: wasCorrect ? '#ffffff' : '#171717',
        wordWrap: { width: contentWidth - 20 },
        align: 'center',
      }).setOrigin(0.5);

      this.resultContainer.add([resultBg, resultIcon, resultLabel, guessText]);
    } else {
      const matches = (data.matches as string[]) || [];
      const guesses = (data.guesses as unknown[]) || [];

      const statsText = this.add.text(0, 80, `${matches.length} of ${guesses.length} matched!`, {
        fontSize: '32px',
        color: '#171717',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.resultContainer.add(statsText);
    }

    this.resultContainer.setVisible(true);
    this.statusText.setText('Waiting for host...');
  }

  private showRoundSummary() {
    const data = this.mockData;
    const qNum = (data.questionNumber as number) || 1;
    const scores = (data.scores as Array<{ id: string; name: string; score: number; isMainCharacter: boolean }>) || [];
    const contentWidth = GAME_WIDTH - 40;

    this.summaryContainer.setY(300);

    const title = this.add.text(0, -150, `Question ${qNum}`, {
      fontSize: '32px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -110, 'Complete!', {
      fontSize: '20px',
      color: '#6b7280',
    }).setOrigin(0.5);

    this.summaryContainer.add([title, subtitle]);

    const guessers = scores.filter(s => !s.isMainCharacter);

    guessers.slice(0, 5).forEach((entry, i) => {
      const y = -50 + (i * 55);
      const isMe = !data.isMainCharacter && i === 1;

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

    this.summaryContainer.setVisible(true);
    this.statusText.setText('Next question coming...');
  }

  private showGameOver() {
    const data = this.mockData;
    const mcName = data.mainCharacterName as string;
    const winner = data.winner as { name: string; score: number } | undefined;
    const contentWidth = GAME_WIDTH - 40;

    this.summaryContainer.setY(320);

    const trophy = this.add.text(0, -160, '🏆', { fontSize: '80px' }).setOrigin(0.5);

    const title = this.add.text(0, -60, 'GAME OVER', {
      fontSize: '36px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -15, `Who knows ${mcName} best?`, {
      fontSize: '18px',
      color: '#6b7280',
    }).setOrigin(0.5);

    const winnerBg = this.add.rectangle(0, 70, contentWidth, 100, COLORS.gold, 0.2);

    const winnerName = this.add.text(0, 50, winner?.name || 'Nobody', {
      fontSize: '42px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const winnerScore = this.add.text(0, 100, `${winner?.score || 0} correct`, {
      fontSize: '24px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.summaryContainer.add([trophy, title, subtitle, winnerBg, winnerName, winnerScore]);
    this.summaryContainer.setVisible(true);
    this.statusText.setText('Thanks for playing!');
  }
}
