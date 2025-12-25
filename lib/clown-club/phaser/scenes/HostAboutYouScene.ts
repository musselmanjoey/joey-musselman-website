import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';

/**
 * HostAboutYouScene - TV display for "How Well Do You Know Me?" game
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

interface Player {
  id: string;
  name: string;
}

interface GuessData {
  playerId: string;
  playerName: string;
  guess: string;
}

interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  isMainCharacter: boolean;
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
  scores?: ScoreEntry[];
  isLastQuestion?: boolean;
  winner?: { id: string; name: string; score: number };
  finalScores?: ScoreEntry[];
  players?: Player[];
  guesses?: GuessData[];
  matches?: string[];
  approvedGuesses?: string[];
}

interface GameState {
  gameType: string;
  phase: string;
  mainCharacterId?: string;
  mainCharacterName?: string;
  question?: Question;
  questionNumber?: number;
  totalQuestions?: number;
  timer?: number;
  mainCharacterAnswer?: string;
  guesses?: GuessData[];
  matches?: string[];
  approvedGuesses?: string[];
  scores?: ScoreEntry[];
  players?: Player[];
  answeredPlayers?: string[];
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

export class HostAboutYouScene extends Phaser.Scene {
  private socket!: Socket;

  // State
  private phase: string = 'lobby';
  private mainCharacterId: string = '';
  private mainCharacterName: string = '';
  private players: Player[] = [];
  private questionNumber: number = 1;
  private totalQuestions: number = 8;
  private timer: number = 0;
  private guesses: GuessData[] = [];
  private matches: string[] = [];
  private approvedGuesses: string[] = [];
  private scores: ScoreEntry[] = [];
  private answeredPlayers: string[] = [];

  // UI Elements
  private headerContainer!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private questionProgressText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timerBg!: Phaser.GameObjects.Arc;

  private mainContainer!: Phaser.GameObjects.Container;
  private lobbyContainer!: Phaser.GameObjects.Container;
  private answeringContainer!: Phaser.GameObjects.Container;
  private revealContainer!: Phaser.GameObjects.Container;
  private summaryContainer!: Phaser.GameObjects.Container;

  private sidePanel!: Phaser.GameObjects.Container;

  constructor() {
    super('HostAboutYouScene');
  }

  create() {
    this.socket = this.registry.get('socket');

    if (!this.socket) {
      this.add.text(640, 360, 'Connection error', { fontSize: '32px', color: '#ff0000' }).setOrigin(0.5);
      return;
    }

    // Reset state
    this.phase = 'lobby';
    this.mainCharacterId = '';
    this.mainCharacterName = '';
    this.players = [];
    this.guesses = [];
    this.matches = [];
    this.approvedGuesses = [];
    this.scores = [];
    this.answeredPlayers = [];

    this.createUI();
    this.setupSocketListeners();
    this.socket.emit('game:request-state');
  }

  private createUI() {
    // Background
    this.add.rectangle(640, 360, 1280, 720, COLORS.background);

    // Decorative lines
    this.add.rectangle(640, 2, 1280, 4, COLORS.accent);
    this.add.rectangle(640, 718, 1280, 4, COLORS.accent);

    // Header
    this.createHeader();

    // Main content area
    this.mainContainer = this.add.container(480, 380);

    // Side panel for scores
    this.createSidePanel();

    // Phase containers
    this.lobbyContainer = this.add.container(480, 380);
    this.answeringContainer = this.add.container(480, 380);
    this.revealContainer = this.add.container(480, 360);
    this.summaryContainer = this.add.container(640, 360);

    this.hideAllContainers();
  }

  private createHeader() {
    this.headerContainer = this.add.container(640, 50);

    // Title
    this.titleText = this.add.text(0, 0, '💭 ABOUT YOU', {
      fontSize: '42px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Question progress (left)
    this.questionProgressText = this.add.text(-500, 0, '', {
      fontSize: '24px',
      color: '#dc2626',
    }).setOrigin(0, 0.5);

    // Timer (right)
    this.timerBg = this.add.circle(480, 0, 32, COLORS.panel);
    this.timerText = this.add.text(480, 0, '', {
      fontSize: '24px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.headerContainer.add([this.titleText, this.questionProgressText, this.timerBg, this.timerText]);
  }

  private createSidePanel() {
    // Panel background
    this.add.rectangle(1080, 400, 280, 560, COLORS.panel)
      .setStrokeStyle(2, COLORS.border);

    this.sidePanel = this.add.container(1080, 200);

    const title = this.add.text(0, -80, 'SCOREBOARD', {
      fontSize: '20px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.sidePanel.add(title);
  }

  private hideAllContainers() {
    this.lobbyContainer.setVisible(false);
    this.lobbyContainer.removeAll(true);
    this.answeringContainer.setVisible(false);
    this.answeringContainer.removeAll(true);
    this.revealContainer.setVisible(false);
    this.revealContainer.removeAll(true);
    this.summaryContainer.setVisible(false);
    this.summaryContainer.removeAll(true);
    this.mainContainer.removeAll(true);
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

    // Answer received - update progress
    this.socket.on('ay:answer-received', (data: { playerId: string; playerName: string; totalAnswers: number; totalPlayers: number }) => {
      if (!this.answeredPlayers.includes(data.playerId)) {
        this.answeredPlayers.push(data.playerId);
      }
      this.updateAnswerProgress(data.totalAnswers, data.totalPlayers);
    });

    // Game state (for rejoins)
    this.socket.on('game:state', (state: GameState) => {
      if (state.gameType !== 'about-you') return;

      this.mainCharacterId = state.mainCharacterId || '';
      this.mainCharacterName = state.mainCharacterName || '';
      this.players = state.players || [];
      this.questionNumber = state.questionNumber || 1;
      this.totalQuestions = state.totalQuestions || 8;
      this.guesses = state.guesses || [];
      this.matches = state.matches || [];
      this.approvedGuesses = state.approvedGuesses || [];
      this.scores = state.scores || [];
      this.answeredPlayers = state.answeredPlayers || [];

      this.updateHeader();
      this.updateScoreboard();

      this.handlePhaseChange({
        phase: state.phase,
        question: state.question,
        questionNumber: state.questionNumber,
        totalQuestions: state.totalQuestions,
        mainCharacterId: state.mainCharacterId,
        mainCharacterName: state.mainCharacterName,
        mainCharacterAnswer: state.mainCharacterAnswer,
        timer: state.timer,
        guesses: state.guesses,
        matches: state.matches,
        approvedGuesses: state.approvedGuesses,
        scores: state.scores,
        players: state.players,
      });
    });

    // Game ended
    this.socket.on('game:ended', () => this.returnToWorld());
  }

  private handlePhaseChange(data: PhaseData) {
    this.phase = data.phase;

    if (data.mainCharacterId) this.mainCharacterId = data.mainCharacterId;
    if (data.mainCharacterName) this.mainCharacterName = data.mainCharacterName;
    if (data.players) this.players = data.players;
    if (data.questionNumber) this.questionNumber = data.questionNumber;
    if (data.totalQuestions) this.totalQuestions = data.totalQuestions;
    if (data.guesses) this.guesses = data.guesses;
    if (data.matches) this.matches = data.matches;
    if (data.approvedGuesses) this.approvedGuesses = data.approvedGuesses;
    if (data.scores) {
      this.scores = data.scores;
      this.updateScoreboard();
    }

    // Reset answered players on new question
    if (data.phase === 'answering') {
      this.answeredPlayers = [];
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

  private updateHeader() {
    if (this.phase === 'lobby') {
      this.questionProgressText.setText('');
    } else {
      this.questionProgressText.setText(`Question ${this.questionNumber}/${this.totalQuestions}`);
    }
  }

  private updateTimer(seconds: number) {
    this.timer = seconds;
    this.timerText.setText(seconds.toString());

    if (seconds <= 10 && seconds > 0) {
      this.timerBg.setFillStyle(COLORS.danger);
      this.tweens.add({
        targets: [this.timerBg, this.timerText],
        scale: { from: 1, to: 1.2 },
        duration: 150,
        yoyo: true,
      });
    } else {
      this.timerBg.setFillStyle(COLORS.panel);
    }
  }

  private updateScoreboard() {
    // Clear existing entries (keep title)
    while (this.sidePanel.length > 1) {
      const child = this.sidePanel.getAt(1);
      if (child) {
        this.sidePanel.remove(child, true);
      }
    }

    // Add scores (excluding MC)
    const guessers = this.scores.filter(s => !s.isMainCharacter);
    guessers.slice(0, 8).forEach((entry, i) => {
      const y = -40 + (i * 35);
      const isFirst = i === 0 && entry.score > 0;

      const rank = this.add.text(-100, y, isFirst ? '👑' : `${i + 1}.`, {
        fontSize: '16px',
        color: isFirst ? '#fbbf24' : '#6b7280',
      });
      const name = this.add.text(-70, y, entry.name, {
        fontSize: '16px',
        color: isFirst ? '#fbbf24' : '#171717',
      });
      const score = this.add.text(100, y, entry.score.toString(), {
        fontSize: '16px',
        color: '#22c55e',
        fontStyle: 'bold',
      });

      this.sidePanel.add([rank, name, score]);
    });
  }

  private updateAnswerProgress(total: number, max: number) {
    const progressText = this.answeringContainer.getByName('answerProgress') as Phaser.GameObjects.Text;
    if (progressText) {
      progressText.setText(`${total}/${max} answered`);
    }
  }

  // ============ PHASE DISPLAYS ============

  private showLobby(data: PhaseData) {
    this.timerText.setText('');

    // Title
    const title = this.add.text(0, -200, 'Select the Main Character', {
      fontSize: '36px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -150, 'Everyone will try to match their answers!', {
      fontSize: '20px',
      color: '#6b7280',
    }).setOrigin(0.5);

    this.lobbyContainer.add([title, subtitle]);

    // Player buttons
    const players = data.players || this.players;
    const cols = Math.min(players.length, 3);

    players.forEach((player, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = (col - (cols - 1) / 2) * 200;
      const y = -50 + row * 80;

      const isSelected = player.id === this.mainCharacterId;

      const btn = this.createPlayerButton(x, y, player.name, isSelected, () => {
        this.socket.emit('ay:select-main-character', { playerId: player.id });
      });

      this.lobbyContainer.add(btn);
    });

    // Start button (only if MC selected)
    if (this.mainCharacterId) {
      const startBtn = this.createButton(0, 180, 'START GAME', () => {
        this.socket.emit('ay:start-game', {});
      }, COLORS.success, 220, 60, '24px');

      this.lobbyContainer.add(startBtn);
    }

    this.lobbyContainer.setVisible(true);
  }

  private showAnswering(data: PhaseData) {
    if (data.timer) {
      this.updateTimer(data.timer);
    }

    // Question - large and prominent
    const questionPrompt = data.question?.prompt || 'Question loading...';
    const question = this.add.text(0, -120, questionPrompt, {
      fontSize: '36px',
      color: '#171717',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 700 },
    }).setOrigin(0.5);

    // MC indicator
    const mcLabel = this.add.text(0, 20, `${this.mainCharacterName} is the Main Character`, {
      fontSize: '22px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Progress
    const progress = this.add.text(0, 80, '0/0 answered', {
      fontSize: '24px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5).setName('answerProgress');

    // Instruction
    const instruction = this.add.text(0, 140, 'Everyone submit your answers!', {
      fontSize: '18px',
      color: '#6b7280',
    }).setOrigin(0.5);

    this.answeringContainer.add([question, mcLabel, progress, instruction]);
    this.answeringContainer.setVisible(true);
  }

  private showReveal(data: PhaseData) {
    this.timerText.setText('');

    // Question at top
    const questionPrompt = data.question?.prompt || '';
    const question = this.add.text(0, -260, questionPrompt, {
      fontSize: '22px',
      color: '#6b7280',
      align: 'center',
      wordWrap: { width: 700 },
    }).setOrigin(0.5);

    // MC's answer (prominent)
    const answerLabel = this.add.text(0, -200, `${this.mainCharacterName}'s Answer:`, {
      fontSize: '18px',
      color: '#171717',
    }).setOrigin(0.5);

    const answerBg = this.add.rectangle(0, -140, 500, 80, COLORS.gold)
      .setStrokeStyle(3, 0x171717, 0.2);

    const answerText = this.add.text(0, -140, `"${data.mainCharacterAnswer || ''}"`, {
      fontSize: '28px',
      color: '#171717',
      fontStyle: 'bold',
      wordWrap: { width: 480 },
      align: 'center',
    }).setOrigin(0.5);

    this.revealContainer.add([question, answerLabel, answerBg, answerText]);

    // Guesses list with approve/unapprove buttons
    const guesses = data.guesses || this.guesses;
    const matches = data.matches || this.matches;
    const approved = data.approvedGuesses || this.approvedGuesses;

    const guessTitle = this.add.text(0, -70, 'Guesses:', {
      fontSize: '18px',
      color: '#6b7280',
    }).setOrigin(0.5);

    this.revealContainer.add(guessTitle);

    const maxDisplay = 6;
    const displayGuesses = guesses.slice(0, maxDisplay);

    displayGuesses.forEach((g, i) => {
      const y = -30 + (i * 50);
      const isCorrect = matches.includes(g.playerId) || approved.includes(g.playerId);
      const isExactMatch = matches.includes(g.playerId) && !approved.includes(g.playerId);

      // Row background - add first so it's behind everything
      const rowBg = this.add.rectangle(0, y, 700, 45, isCorrect ? 0xd1fae5 : COLORS.panel)
        .setStrokeStyle(2, isCorrect ? COLORS.success : COLORS.border);
      this.revealContainer.add(rowBg);

      // Player name
      const name = this.add.text(-320, y, g.playerName, {
        fontSize: '16px',
        color: '#171717',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      this.revealContainer.add(name);

      // Guess text
      const guessText = this.add.text(-180, y, `"${g.guess}"`, {
        fontSize: '16px',
        color: '#171717',
        wordWrap: { width: 300 },
      }).setOrigin(0, 0.5);
      this.revealContainer.add(guessText);

      // Status/button - add last so it's on top
      if (isExactMatch) {
        const check = this.add.text(300, y, '✓ Match', {
          fontSize: '14px',
          color: '#ffffff',
          fontStyle: 'bold',
          backgroundColor: '#22c55e',
          padding: { x: 8, y: 4 },
        }).setOrigin(0.5);
        this.revealContainer.add(check);
      } else if (approved.includes(g.playerId)) {
        const unapproveBtn = this.createSmallButton(300, y, 'Unapprove', () => {
          this.socket.emit('ay:unapprove-guess', { playerId: g.playerId });
        }, COLORS.danger);
        this.revealContainer.add(unapproveBtn);
      } else {
        const approveBtn = this.createSmallButton(300, y, 'Approve', () => {
          this.socket.emit('ay:approve-guess', { playerId: g.playerId });
        }, COLORS.success);
        this.revealContainer.add(approveBtn);
      }
    });

    // Next button
    const nextBtn = this.createButton(0, 260, 'CONFIRM & NEXT →', () => {
      this.socket.emit('ay:confirm-reveal', {});
    }, COLORS.accent, 240, 50, '20px');

    this.revealContainer.add(nextBtn);
    this.revealContainer.setVisible(true);
  }

  private showRoundSummary(data: PhaseData) {
    // Title
    const title = this.add.text(0, -220, `Question ${data.questionNumber} Complete!`, {
      fontSize: '48px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.summaryContainer.add(title);

    // Leaderboard (excluding MC)
    if (data.scores) {
      this.scores = data.scores;
      this.updateScoreboard();

      const guessers = data.scores.filter(s => !s.isMainCharacter);

      const leaderBg = this.add.rectangle(0, 60, 600, 320, COLORS.panel)
        .setStrokeStyle(2, COLORS.border);
      this.summaryContainer.add(leaderBg);

      guessers.slice(0, 6).forEach((entry, i) => {
        const y = -70 + (i * 50);
        const isFirst = i === 0 && entry.score > 0;

        const rank = this.add.text(-250, y, isFirst ? '👑' : `${i + 1}.`, {
          fontSize: isFirst ? '28px' : '24px',
          color: isFirst ? '#fbbf24' : '#6b7280',
        }).setOrigin(0, 0.5);

        const name = this.add.text(-200, y, entry.name, {
          fontSize: '24px',
          color: isFirst ? '#fbbf24' : '#171717',
          fontStyle: isFirst ? 'bold' : 'normal',
        }).setOrigin(0, 0.5);

        const score = this.add.text(200, y, `${entry.score} pts`, {
          fontSize: '24px',
          color: '#22c55e',
          fontStyle: 'bold',
        }).setOrigin(1, 0.5);

        this.summaryContainer.add([rank, name, score]);
      });
    }

    // Next button
    const buttonText = data.isLastQuestion ? 'SEE RESULTS →' : 'NEXT QUESTION →';
    const nextBtn = this.createButton(0, 280, buttonText, () => {
      this.socket.emit('ay:next-question', {});
    }, data.isLastQuestion ? COLORS.gold : COLORS.success, 260, 60, '24px');

    this.summaryContainer.add(nextBtn);
    this.summaryContainer.setVisible(true);
  }

  private showGameOver(data: PhaseData) {
    // Trophy
    const trophy = this.add.text(0, -220, '🏆', {
      fontSize: '80px',
    }).setOrigin(0.5);

    // Title
    const title = this.add.text(0, -130, 'GAME OVER!', {
      fontSize: '56px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Who knows MC best
    const subtitle = this.add.text(0, -70, `Who knows ${data.mainCharacterName || this.mainCharacterName} best?`, {
      fontSize: '24px',
      color: '#6b7280',
    }).setOrigin(0.5);

    // Winner
    const winnerName = this.add.text(0, 0, data.winner?.name || 'Nobody', {
      fontSize: '42px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const winnerScore = this.add.text(0, 50, `${data.winner?.score || 0} correct guesses!`, {
      fontSize: '28px',
      color: '#22c55e',
    }).setOrigin(0.5);

    this.summaryContainer.add([trophy, title, subtitle, winnerName, winnerScore]);

    // Final leaderboard
    if (data.finalScores) {
      const guessers = data.finalScores.filter(s => !s.isMainCharacter);

      const leaderBg = this.add.rectangle(0, 180, 500, 180, COLORS.panel)
        .setStrokeStyle(2, COLORS.border);
      this.summaryContainer.add(leaderBg);

      guessers.slice(0, 4).forEach((entry, i) => {
        const y = 110 + (i * 35);
        const isFirst = i === 0;

        const rank = this.add.text(-200, y, isFirst ? '👑' : `${i + 1}.`, {
          fontSize: '18px',
          color: isFirst ? '#fbbf24' : '#6b7280',
        }).setOrigin(0, 0.5);

        const name = this.add.text(-160, y, entry.name, {
          fontSize: '18px',
          color: isFirst ? '#fbbf24' : '#171717',
          fontStyle: isFirst ? 'bold' : 'normal',
        }).setOrigin(0, 0.5);

        const score = this.add.text(180, y, entry.score.toString(), {
          fontSize: '20px',
          color: '#22c55e',
          fontStyle: 'bold',
        }).setOrigin(1, 0.5);

        this.summaryContainer.add([rank, name, score]);
      });
    }

    // Return message
    const returnText = this.add.text(0, 300, 'Returning to lobby...', {
      fontSize: '20px',
      color: '#6b7280',
    }).setOrigin(0.5);

    this.summaryContainer.add(returnText);
    this.summaryContainer.setVisible(true);
    this.timerText.setText('');
  }

  // ============ BUTTON HELPERS ============

  private createButton(
    x: number, y: number, text: string, onClick: () => void,
    color: number, width: number, height: number, fontSize: string
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, width, height, color)
      .setStrokeStyle(3, 0xffffff, 0.3)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => bg.setAlpha(0.8));
    bg.on('pointerout', () => bg.setAlpha(1));
    bg.on('pointerdown', onClick);

    return container;
  }

  private createPlayerButton(
    x: number, y: number, name: string, isSelected: boolean, onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const color = isSelected ? COLORS.gold : COLORS.panel;
    const textColor = isSelected ? '#ffffff' : '#171717';

    const bg = this.add.rectangle(0, 0, 180, 60, color)
      .setStrokeStyle(3, isSelected ? COLORS.gold : COLORS.border)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, name, {
      fontSize: '20px',
      color: textColor,
      fontStyle: isSelected ? 'bold' : 'normal',
    }).setOrigin(0.5);

    container.add([bg, label]);

    if (!isSelected) {
      bg.on('pointerover', () => bg.setStrokeStyle(3, COLORS.accent));
      bg.on('pointerout', () => bg.setStrokeStyle(3, COLORS.border));
    }
    bg.on('pointerdown', onClick);

    return container;
  }

  private createSmallButton(
    x: number, y: number, text: string, onClick: () => void, color: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 100, 30, color)
      .setStrokeStyle(1, 0xffffff, 0.3)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => bg.setAlpha(0.8));
    bg.on('pointerout', () => bg.setAlpha(1));
    bg.on('pointerdown', onClick);

    return container;
  }

  // ============ LIFECYCLE ============

  private returnToWorld() {
    this.cleanupSocketListeners();
    this.scene.start('HostWorldScene');
  }

  private cleanupSocketListeners() {
    this.socket.off('ay:phase-changed');
    this.socket.off('ay:timer');
    this.socket.off('ay:answer-received');
    this.socket.off('game:state');
    this.socket.off('game:ended');
  }

  shutdown() {
    this.cleanupSocketListeners();
  }
}
