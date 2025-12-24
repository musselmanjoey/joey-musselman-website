import * as Phaser from 'phaser';
import { GameMockData } from '../mockData';

/**
 * About You Debug Scene - Jackbox-style UI
 *
 * Design principles:
 * - Timer is the HERO element when active
 * - Minimal clutter - only show what's needed for current phase
 * - Full-width buttons for easy touch
 * - Generous whitespace
 * - Clear visual hierarchy
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

  // Timer elements (HERO)
  private timerBg!: Phaser.GameObjects.Arc;
  private timerText!: Phaser.GameObjects.Text;

  // Corner badges
  private progressBadge!: Phaser.GameObjects.Container;
  private scoreBadge!: Phaser.GameObjects.Container;
  private progressText!: Phaser.GameObjects.Text;
  private scoreValueText!: Phaser.GameObjects.Text;

  // Status
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('about-youDebugScene');
  }

  create() {
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
    const { width, height } = this.scale;
    const centerX = width / 2;
    const pad = 16;

    // Background
    this.add.rectangle(centerX, height / 2, width, height, COLORS.background);

    // Corner badges (small, unobtrusive)
    this.createCornerBadges(width, pad);

    // Timer container (HERO - centered, prominent)
    this.timerContainer = this.add.container(centerX, 70);
    this.timerBg = this.add.circle(0, 0, 50, COLORS.timerBg);
    this.timerText = this.add.text(0, 0, '', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.timerContainer.add([this.timerBg, this.timerText]);
    this.timerContainer.setVisible(false);

    // Content area - centered vertically
    this.contentContainer = this.add.container(centerX, height * 0.35);

    // Input area - positioned to fit on screen with button visible
    this.inputContainer = this.add.container(centerX, height * 0.62);
    this.createInputUI();

    // Result container
    this.resultContainer = this.add.container(centerX, height * 0.45);
    this.resultContainer.setVisible(false);

    // Summary container
    this.summaryContainer = this.add.container(centerX, height * 0.45);
    this.summaryContainer.setVisible(false);

    // Status text at bottom
    this.statusText = this.add.text(centerX, height - 30, '', {
      fontSize: '16px',
      color: '#9ca3af',
      align: 'center',
    }).setOrigin(0.5);
  }

  private createCornerBadges(width: number, pad: number) {
    // Progress badge (top-left) - "Q1/8"
    this.progressBadge = this.add.container(pad, pad);
    const progBg = this.add.rectangle(0, 0, 60, 28, COLORS.panel, 0.9).setOrigin(0, 0);
    this.progressText = this.add.text(30, 14, '', {
      fontSize: '14px',
      color: '#6b7280',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.progressBadge.add([progBg, this.progressText]);
    this.progressBadge.setVisible(false);

    // Score badge (top-right)
    this.scoreBadge = this.add.container(width - pad, pad);
    const scoreBg = this.add.rectangle(0, 0, 70, 28, COLORS.success, 0.9).setOrigin(1, 0);
    this.scoreValueText = this.add.text(-35, 14, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scoreBadge.add([scoreBg, this.scoreValueText]);
    this.scoreBadge.setVisible(false);
  }

  private createInputUI() {
    const { width } = this.scale;
    const inputWidth = width - 32;

    // Mock textarea - more compact
    const textareaBg = this.add.rectangle(0, -45, inputWidth, 100, 0xffffff)
      .setStrokeStyle(3, COLORS.accent);

    const placeholder = this.add.text(0, -45, 'Type your answer...', {
      fontSize: '18px',
      color: '#9ca3af',
    }).setOrigin(0.5);

    // Full-width submit button
    const submitBtn = this.createButton(0, 40, 'SUBMIT', inputWidth, 56, COLORS.accent);

    this.inputContainer.add([textareaBg, placeholder, submitBtn]);
    this.inputContainer.setVisible(false);
  }

  private createButton(x: number, y: number, text: string, w: number, h: number, color: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, color)
      .setStrokeStyle(2, 0x171717, 0.15);

    const label = this.add.text(0, 0, text, {
      fontSize: '28px',
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
    this.resultContainer.setVisible(false);
    this.resultContainer.removeAll(true);
    this.summaryContainer.setVisible(false);
    this.summaryContainer.removeAll(true);
    this.contentContainer.removeAll(true);
    this.statusText.setText('');
  }

  private updateBadges() {
    const data = this.mockData;

    // Only show badges during gameplay (not lobby)
    if (this.phase === 'lobby' || this.phase === 'game-over') {
      return;
    }

    const qNum = (data.questionNumber as number) || 1;
    const qTotal = (data.totalQuestions as number) || 8;

    // Progress badge
    this.progressText.setText(`${qNum}/${qTotal}`);
    this.progressBadge.setVisible(true);

    // Score badge (only for guessers)
    if (!data.isMainCharacter) {
      this.scoreValueText.setText(`${data.myScore || 0} pts`);
      this.scoreBadge.setVisible(true);
    }

    // Timer (only during answering)
    if (this.phase === 'answering' && data.timer) {
      this.timerText.setText(String(data.timer));
      this.timerContainer.setVisible(true);

      // Color code timer
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
    const { height } = this.scale;

    // Move content container to center for lobby
    this.contentContainer.setY(height * 0.4);

    if (data.isMainCharacter) {
      const star = this.add.text(0, -80, '⭐', { fontSize: '72px' }).setOrigin(0.5);
      const title = this.add.text(0, 20, "You're the\nMain Character!", {
        fontSize: '32px',
        color: '#fbbf24',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 8,
      }).setOrigin(0.5);
      const subtitle = this.add.text(0, 120, 'Answer honestly.\nOthers will try to match!', {
        fontSize: '18px',
        color: '#6b7280',
        align: 'center',
        lineSpacing: 4,
      }).setOrigin(0.5);
      this.contentContainer.add([star, title, subtitle]);
    } else if (mcName) {
      const label = this.add.text(0, -40, 'Main Character', {
        fontSize: '16px',
        color: '#6b7280',
      }).setOrigin(0.5);
      const title = this.add.text(0, 10, mcName, {
        fontSize: '42px',
        color: '#fbbf24',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const hint = this.add.text(0, 80, 'Try to match their answers!', {
        fontSize: '18px',
        color: '#6b7280',
      }).setOrigin(0.5);
      this.contentContainer.add([label, title, hint]);
    } else {
      const waiting = this.add.text(0, 0, 'Waiting for host\nto select\nMain Character...', {
        fontSize: '24px',
        color: '#9ca3af',
        align: 'center',
        lineSpacing: 8,
      }).setOrigin(0.5);
      this.contentContainer.add(waiting);
    }

    this.statusText.setText('Game starting soon...');
  }

  private showAnswering() {
    const data = this.mockData;
    const question = data.question as { prompt: string } | undefined;
    const mcName = data.mainCharacterName as string;
    const { width, height } = this.scale;

    // Reset content container position
    this.contentContainer.setY(height * 0.28);

    // Question text - prominent
    const questionDisplay = this.add.text(0, 0, question?.prompt || 'Question loading...', {
      fontSize: '26px',
      color: '#171717',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width - 48 },
      lineSpacing: 6,
    }).setOrigin(0.5);

    this.contentContainer.add(questionDisplay);

    // Role hint below question
    if (data.isMainCharacter) {
      const hint = this.add.text(0, 70, '⭐ Answer honestly!', {
        fontSize: '18px',
        color: '#fbbf24',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.contentContainer.add(hint);
    } else {
      const hint = this.add.text(0, 70, `What will ${mcName} say?`, {
        fontSize: '18px',
        color: '#9ca3af',
      }).setOrigin(0.5);
      this.contentContainer.add(hint);
    }

    this.inputContainer.setVisible(true);
  }

  private showReveal() {
    const data = this.mockData;
    const mcName = data.mainCharacterName as string;
    const mcAnswer = data.mainCharacterAnswer as string;
    const { width, height } = this.scale;
    const boxWidth = width - 32;

    // Reset container position
    this.resultContainer.setY(height * 0.38);

    // MC's answer - hero element
    const answerLabel = this.add.text(0, -120, `${mcName}'s answer`, {
      fontSize: '16px',
      color: '#6b7280',
    }).setOrigin(0.5);

    const answerBg = this.add.rectangle(0, -50, boxWidth, 80, COLORS.gold);

    const answerText = this.add.text(0, -50, mcAnswer || '', {
      fontSize: '24px',
      color: '#171717',
      fontStyle: 'bold',
      wordWrap: { width: boxWidth - 32 },
      align: 'center',
    }).setOrigin(0.5);

    this.resultContainer.add([answerLabel, answerBg, answerText]);

    // Player result (for guesser)
    if (!data.isMainCharacter) {
      const myAnswer = data.myAnswer as string;
      const wasCorrect = data.wasCorrect as boolean;
      const resultY = 80;

      const resultBg = this.add.rectangle(0, resultY, boxWidth, 100, wasCorrect ? COLORS.success : COLORS.panel);

      const resultIcon = this.add.text(0, resultY - 25, wasCorrect ? '✓' : '✗', {
        fontSize: '32px',
        color: wasCorrect ? '#ffffff' : '#6b7280',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const resultLabel = this.add.text(0, resultY + 15, wasCorrect ? 'You matched!' : 'Your guess:', {
        fontSize: '14px',
        color: wasCorrect ? 'rgba(255,255,255,0.8)' : '#6b7280',
      }).setOrigin(0.5);

      const guessText = this.add.text(0, resultY + 38, myAnswer || 'No answer', {
        fontSize: '18px',
        color: wasCorrect ? '#ffffff' : '#171717',
        wordWrap: { width: boxWidth - 32 },
        align: 'center',
      }).setOrigin(0.5);

      this.resultContainer.add([resultBg, resultIcon, resultLabel, guessText]);
    } else {
      // MC sees match count
      const matches = (data.matches as string[]) || [];
      const guesses = (data.guesses as unknown[]) || [];

      const statsText = this.add.text(0, 80, `${matches.length} of ${guesses.length} matched!`, {
        fontSize: '28px',
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
    const { width, height } = this.scale;
    const boxWidth = width - 32;

    // Reset container position
    this.summaryContainer.setY(height * 0.4);

    const title = this.add.text(0, -140, `Question ${qNum}`, {
      fontSize: '28px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -105, 'Complete!', {
      fontSize: '18px',
      color: '#6b7280',
    }).setOrigin(0.5);

    this.summaryContainer.add([title, subtitle]);

    // Scores (excluding MC)
    const guessers = scores.filter(s => !s.isMainCharacter);

    guessers.slice(0, 4).forEach((entry, i) => {
      const y = -50 + (i * 50);
      const isMe = !data.isMainCharacter && i === 1;

      const rowBg = this.add.rectangle(0, y, boxWidth, 44, isMe ? 0xfef3c7 : COLORS.panel);

      const rank = this.add.text(-boxWidth/2 + 16, y, `${i + 1}`, {
        fontSize: '18px',
        color: '#9ca3af',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      const name = this.add.text(-boxWidth/2 + 44, y, entry.name, {
        fontSize: '20px',
        color: '#171717',
        fontStyle: isMe ? 'bold' : 'normal',
      }).setOrigin(0, 0.5);

      const score = this.add.text(boxWidth/2 - 16, y, `${entry.score}`, {
        fontSize: '22px',
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
    const { height } = this.scale;

    // Reset container position
    this.summaryContainer.setY(height * 0.4);

    const trophy = this.add.text(0, -120, '🏆', { fontSize: '64px' }).setOrigin(0.5);

    const title = this.add.text(0, -40, 'GAME OVER', {
      fontSize: '32px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, 5, `Who knows ${mcName} best?`, {
      fontSize: '16px',
      color: '#6b7280',
    }).setOrigin(0.5);

    const winnerName = this.add.text(0, 60, winner?.name || 'Nobody', {
      fontSize: '36px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const winnerScore = this.add.text(0, 105, `${winner?.score || 0} correct`, {
      fontSize: '20px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.summaryContainer.add([trophy, title, subtitle, winnerName, winnerScore]);
    this.summaryContainer.setVisible(true);
    this.statusText.setText('Thanks for playing!');
  }
}
