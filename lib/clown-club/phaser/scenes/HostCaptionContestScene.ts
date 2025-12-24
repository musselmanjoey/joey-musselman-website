import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';

/**
 * HostCaptionContestScene - TV display for Jackbox-style caption game
 *
 * Phases: intro → submitting → voting → matchup-result → round-summary
 */

interface PhaseData {
  phase: string;
  round?: number;
  totalRounds?: number;
  currentImage?: string;
  timer?: number;
  matchupIndex?: number;
  matchupTotal?: number;
  captionA?: string;
  captionB?: string;
  idA?: string;
  idB?: string;
  winnerName?: string;
  votesA?: number;
  votesB?: number;
  scores?: Array<{ name: string; score: number; roundScore?: number }>;
  isLastRound?: boolean;
  winner?: { name: string; score: number };
  finalScores?: Array<{ name: string; score: number }>;
}

interface MatchupResultData {
  captionA: { text: string; playerName: string };
  captionB: { text: string; playerName: string };
  votesA: number;
  votesB: number;
  winnerName: string;
}

interface SubmissionData {
  playerName: string;
  playerId: string;
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

export class HostCaptionContestScene extends Phaser.Scene {
  private socket!: Socket;

  // State
  private phase: string = 'waiting';
  private round: number = 1;
  private timer: number = 0;
  private submissions: SubmissionData[] = [];
  private scores: Array<{ name: string; score: number; roundScore?: number }> = [];

  // UI Elements
  private headerContainer!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timerBg!: Phaser.GameObjects.Arc;

  private mainContainer!: Phaser.GameObjects.Container;
  private imageSprite?: Phaser.GameObjects.Image;

  private playersPanel!: Phaser.GameObjects.Container;
  private scoreboardPanel!: Phaser.GameObjects.Container;

  private introContainer!: Phaser.GameObjects.Container;
  private submittingContainer!: Phaser.GameObjects.Container;
  private votingContainer!: Phaser.GameObjects.Container;
  private resultContainer!: Phaser.GameObjects.Container;
  private summaryContainer!: Phaser.GameObjects.Container;

  private nextRoundButton?: Phaser.GameObjects.Container;

  constructor() {
    super('HostCaptionContestScene');
  }

  create() {
    this.socket = this.registry.get('socket');

    if (!this.socket) {
      this.add.text(640, 360, 'Connection error', { fontSize: '32px', color: '#ff0000' }).setOrigin(0.5);
      return;
    }

    // Reset state
    this.phase = 'waiting';
    this.submissions = [];
    this.scores = [];

    this.createUI();
    this.setupSocketListeners();
    this.socket.emit('game:request-state');
  }

  private createUI() {
    // Background gradient effect
    this.add.rectangle(640, 360, 1280, 720, COLORS.background);

    // Decorative lines
    this.add.rectangle(640, 2, 1280, 4, COLORS.accent);
    this.add.rectangle(640, 718, 1280, 4, COLORS.accent);

    // Header
    this.createHeader();

    // Main content area (center-left)
    this.mainContainer = this.add.container(480, 380);

    // Players/Scoreboard panel (right side)
    this.createSidePanel();

    // Phase containers
    this.introContainer = this.add.container(480, 380);
    this.submittingContainer = this.add.container(480, 380);
    this.votingContainer = this.add.container(480, 380);
    this.resultContainer = this.add.container(480, 380);
    this.summaryContainer = this.add.container(640, 360);

    this.hideAllContainers();
  }

  private createHeader() {
    this.headerContainer = this.add.container(640, 50);

    // Title
    this.titleText = this.add.text(0, 0, '📸 CAPTION CONTEST', {
      fontSize: '42px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Round (left)
    this.roundText = this.add.text(-500, 0, 'Round 1', {
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

    this.headerContainer.add([this.titleText, this.roundText, this.timerBg, this.timerText]);
  }

  private createSidePanel() {
    // Panel background
    this.add.rectangle(1080, 400, 280, 560, COLORS.panel)
      .setStrokeStyle(2, COLORS.border);

    // Players panel (during submitting)
    this.playersPanel = this.add.container(1080, 200);
    const playersTitle = this.add.text(0, -80, 'PLAYERS', {
      fontSize: '20px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.playersPanel.add(playersTitle);

    // Scoreboard panel (during voting/results)
    this.scoreboardPanel = this.add.container(1080, 200);
    const scoreTitle = this.add.text(0, -80, 'SCOREBOARD', {
      fontSize: '20px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scoreboardPanel.add(scoreTitle);
    this.scoreboardPanel.setVisible(false);
  }

  private hideAllContainers() {
    this.introContainer.setVisible(false);
    this.submittingContainer.setVisible(false);
    this.votingContainer.setVisible(false);
    this.resultContainer.setVisible(false);
    this.summaryContainer.setVisible(false);
    this.mainContainer.removeAll(true);
    this.nextRoundButton?.destroy();
    this.nextRoundButton = undefined;
  }

  private setupSocketListeners() {
    // Phase changes
    this.socket.on('cap:phase-changed', (data: PhaseData) => {
      this.handlePhaseChange(data);
    });

    // Timer updates
    this.socket.on('cap:timer', (data: { secondsLeft: number }) => {
      this.updateTimer(data.secondsLeft);
    });

    // Submission received
    this.socket.on('cap:submission-received', (data: { playerName: string; totalSubmissions: number; totalPlayers: number }) => {
      this.addSubmission(data.playerName);
    });

    // Vote update (live vote counts)
    this.socket.on('cap:vote-update', (data: { votesA: number; votesB: number }) => {
      this.updateLiveVotes(data.votesA, data.votesB);
    });

    // Game state (for rejoins)
    this.socket.on('game:state', (state: {
      gameType: string;
      phase: string;
      round: number;
      timer: number;
      currentImage?: string;
      submissions: SubmissionData[];
      scores: Array<{ name: string; score: number }>;
      matchup?: { captionA: { text: string }; captionB: { text: string }; votesA: number; votesB: number };
    }) => {
      if (state.gameType !== 'caption-contest') return;
      this.round = state.round;
      this.submissions = state.submissions || [];
      this.scores = state.scores || [];
      this.updateHeader();
      this.updateScoreboard();

      if (state.currentImage) {
        this.loadImage(state.currentImage);
      }

      this.handlePhaseChange({
        phase: state.phase,
        round: state.round,
        timer: state.timer,
        currentImage: state.currentImage,
      });
    });

    // Game ended
    this.socket.on('game:ended', () => this.returnToWorld());
  }

  private handlePhaseChange(data: PhaseData) {
    this.phase = data.phase;

    if (data.round) {
      this.round = data.round;
      this.submissions = [];
    }

    if (data.currentImage) {
      this.loadImage(data.currentImage);
    }

    if (data.scores) {
      this.scores = data.scores;
      this.updateScoreboard();
    }

    this.updateHeader();
    this.hideAllContainers();

    switch (data.phase) {
      case 'intro':
        this.showIntro(data);
        break;
      case 'submitting':
        this.showSubmitting(data);
        break;
      case 'voting':
        this.showVoting(data);
        break;
      case 'matchup-result':
        this.showMatchupResult(data as unknown as MatchupResultData & PhaseData);
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
    this.roundText.setText(`Round ${this.round}`);
  }

  private updateTimer(seconds: number) {
    this.timer = seconds;
    this.timerText.setText(seconds.toString());

    // Pulse red when low
    if (seconds <= 5 && seconds > 0) {
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

  // ============ PHASE DISPLAYS ============

  private showIntro(data: PhaseData) {
    this.playersPanel.setVisible(false);
    this.scoreboardPanel.setVisible(false);

    // Big round announcement
    const roundIntro = this.add.text(0, 0, `ROUND ${data.round}`, {
      fontSize: '96px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScale(0);

    this.introContainer.add(roundIntro);
    this.introContainer.setVisible(true);

    // Animate in
    this.tweens.add({
      targets: roundIntro,
      scale: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Subtitle
    const subtitle = this.add.text(0, 80, 'Get ready to caption!', {
      fontSize: '32px',
      color: '#dc2626',
    }).setOrigin(0.5).setAlpha(0);

    this.introContainer.add(subtitle);

    this.tweens.add({
      targets: subtitle,
      alpha: { from: 0, to: 1 },
      delay: 300,
      duration: 300,
    });
  }

  private showSubmitting(data: PhaseData) {
    this.playersPanel.setVisible(true);
    this.scoreboardPanel.setVisible(false);
    this.updatePlayersPanel();

    if (data.timer) {
      this.updateTimer(data.timer);
    }

    // Status text
    const status = this.add.text(0, 200, 'Write your captions!', {
      fontSize: '28px',
      color: '#171717',
    }).setOrigin(0.5);

    this.submittingContainer.add(status);
    this.submittingContainer.setVisible(true);
  }

  private showVoting(data: PhaseData) {
    this.playersPanel.setVisible(false);
    this.scoreboardPanel.setVisible(true);
    this.votingContainer.removeAll(true);

    if (data.timer) {
      this.updateTimer(data.timer);
    }

    // Matchup header
    const matchupText = this.add.text(0, -220, `MATCHUP ${data.matchupIndex} of ${data.matchupTotal}`, {
      fontSize: '24px',
      color: '#6b7280',
    }).setOrigin(0.5);

    // Caption A
    const captionABg = this.add.rectangle(-180, 0, 320, 200, COLORS.panel)
      .setStrokeStyle(3, COLORS.accent);
    const captionAText = this.add.text(-180, -20, `"${data.captionA}"`, {
      fontSize: '20px',
      color: '#171717',
      wordWrap: { width: 280 },
      align: 'center',
    }).setOrigin(0.5);
    const captionAVotes = this.add.text(-180, 70, '0', {
      fontSize: '48px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    captionAVotes.setName('votesA');

    // VS
    const vsText = this.add.text(0, 0, 'VS', {
      fontSize: '36px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Caption B
    const captionBBg = this.add.rectangle(180, 0, 320, 200, COLORS.panel)
      .setStrokeStyle(3, COLORS.accent);
    const captionBText = this.add.text(180, -20, `"${data.captionB}"`, {
      fontSize: '20px',
      color: '#171717',
      wordWrap: { width: 280 },
      align: 'center',
    }).setOrigin(0.5);
    const captionBVotes = this.add.text(180, 70, '0', {
      fontSize: '48px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    captionBVotes.setName('votesB');

    // Vote instruction
    const voteText = this.add.text(0, 160, 'Players vote on their phones!', {
      fontSize: '20px',
      color: '#6b7280',
    }).setOrigin(0.5);

    this.votingContainer.add([
      matchupText,
      captionABg, captionAText, captionAVotes,
      vsText,
      captionBBg, captionBText, captionBVotes,
      voteText,
    ]);
    this.votingContainer.setVisible(true);
  }

  private updateLiveVotes(votesA: number, votesB: number) {
    const vA = this.votingContainer.getByName('votesA') as Phaser.GameObjects.Text;
    const vB = this.votingContainer.getByName('votesB') as Phaser.GameObjects.Text;

    if (vA) {
      vA.setText(votesA.toString());
      this.tweens.add({
        targets: vA,
        scale: { from: 1.2, to: 1 },
        duration: 150,
      });
    }
    if (vB) {
      vB.setText(votesB.toString());
      this.tweens.add({
        targets: vB,
        scale: { from: 1.2, to: 1 },
        duration: 150,
      });
    }
  }

  private showMatchupResult(data: MatchupResultData & PhaseData) {
    this.resultContainer.removeAll(true);

    // Winner announcement
    const winnerText = this.add.text(0, -180,
      data.winnerName === 'TIE!' ? "IT'S A TIE!" : `${data.winnerName.toUpperCase()} WINS!`,
      {
        fontSize: '42px',
        color: '#fbbf24',
        fontStyle: 'bold',
      }).setOrigin(0.5).setScale(0);

    // Animate winner text
    this.tweens.add({
      targets: winnerText,
      scale: { from: 0, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Caption A result
    const captionABg = this.add.rectangle(-180, 20, 320, 220,
      data.votesA > data.votesB ? 0x22c55e : COLORS.panel)
      .setStrokeStyle(3, data.votesA > data.votesB ? 0x22c55e : COLORS.border);
    const captionAName = this.add.text(-180, -60, data.captionA?.playerName || '', {
      fontSize: '22px',
      color: '#dc2626',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const captionAText = this.add.text(-180, 0, `"${data.captionA?.text || ''}"`, {
      fontSize: '18px',
      color: data.votesA > data.votesB ? '#ffffff' : '#171717',
      wordWrap: { width: 280 },
      align: 'center',
    }).setOrigin(0.5);

    // Vote bar A
    const voteBarABg = this.add.rectangle(-180, 80, 280, 30, COLORS.panel);
    const voteBarA = this.add.rectangle(-310, 80, 0, 26, COLORS.success).setOrigin(0, 0.5);
    const voteTextA = this.add.text(-180, 80, `${data.votesA} votes`, {
      fontSize: '16px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Animate vote bar A
    const maxWidth = 280;
    const totalVotes = data.votesA + data.votesB || 1;
    const widthA = (data.votesA / totalVotes) * maxWidth;
    this.tweens.add({
      targets: voteBarA,
      width: widthA,
      duration: 800,
      ease: 'Power2',
      delay: 400,
    });

    // Caption B result
    const captionBBg = this.add.rectangle(180, 20, 320, 220,
      data.votesB > data.votesA ? 0x22c55e : COLORS.panel)
      .setStrokeStyle(3, data.votesB > data.votesA ? 0x22c55e : COLORS.border);
    const captionBName = this.add.text(180, -60, data.captionB?.playerName || '', {
      fontSize: '22px',
      color: '#dc2626',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const captionBText = this.add.text(180, 0, `"${data.captionB?.text || ''}"`, {
      fontSize: '18px',
      color: data.votesB > data.votesA ? '#ffffff' : '#171717',
      wordWrap: { width: 280 },
      align: 'center',
    }).setOrigin(0.5);

    // Vote bar B
    const voteBarBBg = this.add.rectangle(180, 80, 280, 30, COLORS.panel);
    const voteBarB = this.add.rectangle(50, 80, 0, 26, COLORS.success).setOrigin(0, 0.5);
    const voteTextB = this.add.text(180, 80, `${data.votesB} votes`, {
      fontSize: '16px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Animate vote bar B
    const widthB = (data.votesB / totalVotes) * maxWidth;
    this.tweens.add({
      targets: voteBarB,
      width: widthB,
      duration: 800,
      ease: 'Power2',
      delay: 400,
    });

    this.resultContainer.add([
      winnerText,
      captionABg, captionAName, captionAText, voteBarABg, voteBarA, voteTextA,
      captionBBg, captionBName, captionBText, voteBarBBg, voteBarB, voteTextB,
    ]);
    this.resultContainer.setVisible(true);

    this.timerText.setText('');
  }

  private showRoundSummary(data: PhaseData) {
    this.summaryContainer.removeAll(true);
    this.playersPanel.setVisible(false);
    this.scoreboardPanel.setVisible(false);

    // Title
    const title = this.add.text(0, -200, `ROUND ${data.round} COMPLETE!`, {
      fontSize: '48px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.summaryContainer.add(title);

    // Leaderboard
    if (data.scores) {
      this.scores = data.scores;

      const leaderBg = this.add.rectangle(0, 60, 600, 350, COLORS.panel)
        .setStrokeStyle(2, COLORS.border);
      this.summaryContainer.add(leaderBg);

      data.scores.slice(0, 6).forEach((entry, i) => {
        const y = -80 + (i * 55);
        const isFirst = i === 0;

        // Rank
        const rank = this.add.text(-250, y, isFirst ? '👑' : `${i + 1}.`, {
          fontSize: isFirst ? '28px' : '24px',
          color: isFirst ? '#fbbf24' : '#6b7280',
        }).setOrigin(0, 0.5);

        // Name
        const name = this.add.text(-200, y, entry.name, {
          fontSize: '24px',
          color: isFirst ? '#fbbf24' : '#171717',
          fontStyle: isFirst ? 'bold' : 'normal',
        }).setOrigin(0, 0.5);

        // Score
        const score = this.add.text(180, y, entry.score.toString(), {
          fontSize: '28px',
          color: '#22c55e',
          fontStyle: 'bold',
        }).setOrigin(1, 0.5);

        // Round score change
        if (entry.roundScore && entry.roundScore > 0) {
          const delta = this.add.text(250, y, `+${entry.roundScore}`, {
            fontSize: '20px',
            color: '#dc2626',
          }).setOrigin(1, 0.5);
          this.summaryContainer.add(delta);
        }

        this.summaryContainer.add([rank, name, score]);
      });
    }

    // Next round / Finish button
    const buttonText = data.isLastRound ? 'SEE RESULTS →' : 'NEXT ROUND →';
    const buttonColor = data.isLastRound ? COLORS.gold : COLORS.success;
    this.nextRoundButton = this.createButton(0, 280, buttonText, () => {
      this.socket.emit('cap:next-round', {});
    }, buttonColor, 240, 60, '24px');
    this.summaryContainer.add(this.nextRoundButton);

    this.summaryContainer.setVisible(true);
    this.timerText.setText('');
  }

  private showGameOver(data: PhaseData) {
    this.summaryContainer.removeAll(true);
    this.playersPanel.setVisible(false);
    this.scoreboardPanel.setVisible(false);

    // Winner announcement
    const trophy = this.add.text(0, -220, '🏆', {
      fontSize: '80px',
    }).setOrigin(0.5);

    const winnerTitle = this.add.text(0, -130, 'WINNER!', {
      fontSize: '56px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const winnerName = this.add.text(0, -60, data.winner?.name || 'Nobody', {
      fontSize: '42px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const winnerScore = this.add.text(0, -10, `${data.winner?.score || 0} points`, {
      fontSize: '28px',
      color: '#22c55e',
    }).setOrigin(0.5);

    this.summaryContainer.add([trophy, winnerTitle, winnerName, winnerScore]);

    // Final leaderboard
    if (data.finalScores) {
      const leaderBg = this.add.rectangle(0, 150, 500, 220, COLORS.panel)
        .setStrokeStyle(2, COLORS.border);
      this.summaryContainer.add(leaderBg);

      data.finalScores.slice(0, 4).forEach((entry, i) => {
        const y = 70 + (i * 40);
        const isFirst = i === 0;

        const rank = this.add.text(-200, y, isFirst ? '👑' : `${i + 1}.`, {
          fontSize: '22px',
          color: isFirst ? '#fbbf24' : '#6b7280',
        }).setOrigin(0, 0.5);

        const name = this.add.text(-160, y, entry.name, {
          fontSize: '22px',
          color: isFirst ? '#fbbf24' : '#171717',
          fontStyle: isFirst ? 'bold' : 'normal',
        }).setOrigin(0, 0.5);

        const score = this.add.text(180, y, entry.score.toString(), {
          fontSize: '24px',
          color: '#22c55e',
          fontStyle: 'bold',
        }).setOrigin(1, 0.5);

        this.summaryContainer.add([rank, name, score]);
      });
    }

    // Returning to lobby message
    const returnText = this.add.text(0, 290, 'Returning to lobby...', {
      fontSize: '20px',
      color: '#6b7280',
    }).setOrigin(0.5);
    this.summaryContainer.add(returnText);

    this.summaryContainer.setVisible(true);
    this.timerText.setText('');
  }

  // ============ HELPERS ============

  private addSubmission(playerName: string) {
    if (!this.submissions.find(s => s.playerName === playerName)) {
      this.submissions.push({ playerName, playerId: '' });
      this.updatePlayersPanel();
    }
  }

  private updatePlayersPanel() {
    // Clear existing player entries (keep title at index 0)
    while (this.playersPanel.length > 1) {
      const child = this.playersPanel.getAt(1);
      if (child) {
        this.playersPanel.remove(child, true);
      }
    }

    // Add player status
    this.submissions.forEach((sub, i) => {
      const y = -40 + (i * 35);
      const check = this.add.text(-80, y, '✓', {
        fontSize: '20px',
        color: '#22c55e',
      });
      const name = this.add.text(-50, y, sub.playerName, {
        fontSize: '18px',
        color: '#171717',
      });
      this.playersPanel.add([check, name]);
    });
  }

  private updateScoreboard() {
    // Clear existing score entries (keep title at index 0)
    while (this.scoreboardPanel.length > 1) {
      const child = this.scoreboardPanel.getAt(1);
      if (child) {
        this.scoreboardPanel.remove(child, true);
      }
    }

    // Add scores
    const sortedScores = [...this.scores].sort((a, b) => b.score - a.score);
    sortedScores.slice(0, 8).forEach((entry, i) => {
      const y = -40 + (i * 32);
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

      this.scoreboardPanel.add([rank, name, score]);
    });
  }

  private loadImage(imageUrl: string) {
    this.imageSprite?.destroy();

    const key = 'hostImage_' + Date.now();

    const displayImage = () => {
      this.imageSprite = this.add.image(0, -40, key);
      const maxWidth = 500;
      const maxHeight = 280;
      const scaleX = maxWidth / this.imageSprite.width;
      const scaleY = maxHeight / this.imageSprite.height;
      const scale = Math.min(scaleX, scaleY, 1);
      this.imageSprite.setScale(scale);
      this.mainContainer.add(this.imageSprite);
    };

    if (imageUrl.startsWith('data:')) {
      const img = new Image();
      img.onload = () => {
        if (this.textures.exists(key)) this.textures.remove(key);
        this.textures.addImage(key, img);
        displayImage();
      };
      img.src = imageUrl;
    } else {
      this.load.image(key, imageUrl);
      this.load.once('complete', displayImage);
      this.load.start();
    }
  }

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

  private returnToWorld() {
    this.cleanupSocketListeners();
    this.scene.start('HostWorldScene');
  }

  private cleanupSocketListeners() {
    this.socket.off('cap:phase-changed');
    this.socket.off('cap:timer');
    this.socket.off('cap:submission-received');
    this.socket.off('cap:vote-update');
    this.socket.off('game:state');
    this.socket.off('game:ended');
  }

  shutdown() {
    this.cleanupSocketListeners();
  }
}
