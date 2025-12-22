import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';

/**
 * CaptionContestScene - Player mobile view for Jackbox-style caption game
 *
 * Phases: intro → submitting → voting → matchup-result → round-summary
 */

interface PhaseData {
  phase: string;
  round?: number;
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
}

interface MatchupResultData {
  captionA: { text: string; playerName: string };
  captionB: { text: string; playerName: string };
  votesA: number;
  votesB: number;
  winnerName: string;
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

export class CaptionContestScene extends Phaser.Scene {
  private socket!: Socket;
  private playerId!: string;
  private playerName!: string;

  // State
  private phase: string = 'waiting';
  private round: number = 1;
  private myScore: number = 0;
  private hasSubmitted: boolean = false;
  private hasVoted: boolean = false;
  private timer: number = 0;

  // UI Elements
  private headerContainer!: Phaser.GameObjects.Container;
  private roundText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timerBg!: Phaser.GameObjects.Arc;

  private contentContainer!: Phaser.GameObjects.Container;
  private imageSprite?: Phaser.GameObjects.Image;
  private statusText!: Phaser.GameObjects.Text;

  private inputContainer!: Phaser.GameObjects.Container;
  private captionInput?: Phaser.GameObjects.DOMElement;
  private submitButton!: Phaser.GameObjects.Container;

  private votingContainer!: Phaser.GameObjects.Container;
  private resultContainer!: Phaser.GameObjects.Container;
  private summaryContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('CaptionContestScene');
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
    this.phase = 'waiting';
    this.hasSubmitted = false;
    this.hasVoted = false;

    this.createUI();
    this.setupSocketListeners();
    this.socket.emit('game:request-state');
  }

  private createUI() {
    // Background
    this.add.rectangle(400, 300, 800, 600, COLORS.background);

    // Header
    this.createHeader();

    // Content area
    this.contentContainer = this.add.container(400, 280);

    // Status text
    this.statusText = this.add.text(400, 480, '', {
      fontSize: '20px',
      color: '#171717',
      align: 'center',
    }).setOrigin(0.5);

    // Input area (for submitting)
    this.createInputUI();

    // Voting area
    this.createVotingUI();

    // Result area
    this.createResultUI();

    // Summary area
    this.createSummaryUI();

    // Leave button
    this.createButton(400, 560, 'Leave Game', () => {
      this.socket.emit('game:leave');
    }, COLORS.danger, 140, 40, '16px');
  }

  private createHeader() {
    this.headerContainer = this.add.container(400, 35);

    // Round
    this.roundText = this.add.text(-350, 0, 'Round 1', {
      fontSize: '18px',
      color: '#dc2626',
    }).setOrigin(0, 0.5);

    // Score
    this.scoreText = this.add.text(350, 0, 'Score: 0', {
      fontSize: '18px',
      color: '#22c55e',
    }).setOrigin(1, 0.5);

    // Timer (circular)
    this.timerBg = this.add.circle(0, 0, 28, COLORS.panel);
    this.timerText = this.add.text(0, 0, '', {
      fontSize: '20px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.headerContainer.add([this.roundText, this.scoreText, this.timerBg, this.timerText]);
  }

  private createInputUI() {
    this.inputContainer = this.add.container(400, 420);

    const inputHtml = `
      <textarea
        id="caption-input"
        placeholder="Write something funny..."
        maxlength="150"
        style="
          width: 320px;
          height: 70px;
          padding: 12px;
          font-size: 16px;
          border-radius: 12px;
          border: 2px solid #dc2626;
          background: #ffffff;
          color: #171717;
          resize: none;
          outline: none;
          font-family: inherit;
        "
      ></textarea>
    `;
    this.captionInput = this.add.dom(0, -30).createFromHTML(inputHtml);

    this.submitButton = this.createButton(0, 50, 'Submit Caption', () => {
      const textarea = document.getElementById('caption-input') as HTMLTextAreaElement;
      if (textarea && textarea.value.trim()) {
        this.socket.emit('cap:submit-caption', { caption: textarea.value.trim() });
        this.hasSubmitted = true;
        this.showSubmittedState();
      }
    }, COLORS.accent, 200, 50, '18px');

    this.inputContainer.add([this.captionInput, this.submitButton]);
    this.inputContainer.setVisible(false);
  }

  private createVotingUI() {
    this.votingContainer = this.add.container(400, 320);
    this.votingContainer.setVisible(false);
  }

  private createResultUI() {
    this.resultContainer = this.add.container(400, 300);
    this.resultContainer.setVisible(false);
  }

  private createSummaryUI() {
    this.summaryContainer = this.add.container(400, 300);
    this.summaryContainer.setVisible(false);
  }

  private createButton(
    x: number, y: number, text: string, onClick: () => void,
    color: number, width: number, height: number, fontSize: string = '18px'
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, width, height, color)
      .setStrokeStyle(2, 0x171717, 0.2)
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
    this.socket.on('cap:submission-received', (data: { totalSubmissions: number; totalPlayers: number }) => {
      if (this.hasSubmitted) {
        this.statusText.setText(`Submitted! ${data.totalSubmissions}/${data.totalPlayers} ready`);
      }
    });

    // Vote update
    this.socket.on('cap:vote-update', () => {
      // Could show live vote counts here if desired
    });

    // Game state (for rejoins)
    this.socket.on('game:state', (state: { gameType: string; phase: string; round: number; myScore: number; hasSubmitted: boolean; hasVoted: boolean; timer: number; currentImage?: string; matchup?: { captionA: string; captionB: string; idA: string; idB: string }; isInMatchup?: boolean }) => {
      if (state.gameType !== 'caption-contest') return;
      this.round = state.round;
      this.myScore = state.myScore;
      this.hasSubmitted = state.hasSubmitted;
      this.hasVoted = state.hasVoted;
      this.updateHeader();

      // Reconstruct current phase
      if (state.currentImage) {
        this.loadImage(state.currentImage);
      }
      this.handlePhaseChange({
        phase: state.phase,
        round: state.round,
        timer: state.timer,
        ...state.matchup,
      });
    });

    // Game ended
    this.socket.on('game:ended', () => this.returnToLobby());
    this.socket.on('game:left', () => this.returnToLobby());
  }

  private handlePhaseChange(data: PhaseData) {
    this.phase = data.phase;

    if (data.round) {
      this.round = data.round;
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
    }
  }

  private hideAllContainers() {
    this.inputContainer.setVisible(false);
    this.votingContainer.setVisible(false);
    this.resultContainer.setVisible(false);
    this.summaryContainer.setVisible(false);
    this.contentContainer.removeAll(true);
  }

  private updateHeader() {
    this.roundText.setText(`Round ${this.round}`);
    this.scoreText.setText(`Score: ${this.myScore}`);
  }

  private updateTimer(seconds: number) {
    this.timer = seconds;
    this.timerText.setText(seconds.toString());

    // Pulse red when low
    if (seconds <= 5 && seconds > 0) {
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

  private showIntro(data: PhaseData) {
    if (data.currentImage) {
      this.loadImage(data.currentImage);
    }

    // Big round text with animation
    const introText = this.add.text(0, 0, `ROUND ${data.round}`, {
      fontSize: '48px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScale(0);

    this.contentContainer.add(introText);

    this.tweens.add({
      targets: introText,
      scale: { from: 0, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.statusText.setText('Get ready to caption!');
  }

  private showSubmitting(data: PhaseData) {
    this.hasSubmitted = false;
    this.hasVoted = false;

    if (data.currentImage) {
      this.loadImage(data.currentImage);
    }

    if (data.timer) {
      this.updateTimer(data.timer);
    }

    // Clear and show input
    const textarea = document.getElementById('caption-input') as HTMLTextAreaElement;
    if (textarea) textarea.value = '';

    this.inputContainer.setVisible(true);
    this.submitButton.setVisible(true);
    this.statusText.setText('Write a funny caption!');
  }

  private showSubmittedState() {
    this.inputContainer.setVisible(false);
    this.statusText.setText('Caption submitted! Waiting for others...');

    // Show checkmark
    const check = this.add.text(0, 0, '✓', {
      fontSize: '64px',
      color: '#22c55e',
    }).setOrigin(0.5).setScale(0);

    this.contentContainer.add(check);

    this.tweens.add({
      targets: check,
      scale: { from: 0, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private showVoting(data: PhaseData) {
    this.hasVoted = false;
    this.votingContainer.removeAll(true);

    if (data.timer) {
      this.updateTimer(data.timer);
    }

    // Check if player is in this matchup (can't vote for own caption)
    if (!data.captionA || !data.captionB) {
      // Player is in this matchup - show waiting
      const waitText = this.add.text(0, 0, 'Your caption is up!\nWaiting for votes...', {
        fontSize: '24px',
        color: '#fbbf24',
        align: 'center',
      }).setOrigin(0.5);
      this.votingContainer.add(waitText);
      this.votingContainer.setVisible(true);
      this.statusText.setText(`Matchup ${data.matchupIndex} of ${data.matchupTotal}`);
      return;
    }

    // Title
    const title = this.add.text(0, -140, 'Which is funnier?', {
      fontSize: '24px',
      color: '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Option A
    const optionA = this.createVoteOption(0, -50, data.captionA, () => {
      if (!this.hasVoted) {
        this.hasVoted = true;
        this.socket.emit('cap:vote-matchup', { votedForId: data.idA });
        this.showVotedState();
      }
    });

    // VS
    const vs = this.add.text(0, 30, 'VS', {
      fontSize: '20px',
      color: '#6b7280',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Option B
    const optionB = this.createVoteOption(0, 110, data.captionB, () => {
      if (!this.hasVoted) {
        this.hasVoted = true;
        this.socket.emit('cap:vote-matchup', { votedForId: data.idB });
        this.showVotedState();
      }
    });

    this.votingContainer.add([title, optionA, vs, optionB]);
    this.votingContainer.setVisible(true);
    this.statusText.setText(`Matchup ${data.matchupIndex} of ${data.matchupTotal}`);
  }

  private createVoteOption(x: number, y: number, caption: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 340, 70, COLORS.panel)
      .setStrokeStyle(2, COLORS.border)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, `"${caption}"`, {
      fontSize: '16px',
      color: '#171717',
      wordWrap: { width: 310 },
      align: 'center',
    }).setOrigin(0.5);

    container.add([bg, text]);

    bg.on('pointerover', () => bg.setStrokeStyle(3, COLORS.accent));
    bg.on('pointerout', () => bg.setStrokeStyle(2, COLORS.border));
    bg.on('pointerdown', onClick);

    return container;
  }

  private showVotedState() {
    this.votingContainer.setVisible(false);

    const voted = this.add.text(0, 0, 'Vote cast!', {
      fontSize: '28px',
      color: '#22c55e',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScale(0);

    this.contentContainer.add(voted);

    this.tweens.add({
      targets: voted,
      scale: { from: 0, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.statusText.setText('Waiting for others...');
  }

  private showMatchupResult(data: MatchupResultData & PhaseData) {
    this.resultContainer.removeAll(true);

    // Winner announcement
    const winnerText = this.add.text(0, -80, data.winnerName === 'TIE!' ? "It's a TIE!" : `${data.winnerName} wins!`, {
      fontSize: '28px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Caption A result
    const captionABg = this.add.rectangle(-90, 20, 160, 80,
      data.votesA > data.votesB ? 0x22c55e : COLORS.panel);
    const captionAText = this.add.text(-90, 10, `"${data.captionA?.text || ''}"`, {
      fontSize: '12px',
      color: data.votesA > data.votesB ? '#ffffff' : '#171717',
      wordWrap: { width: 140 },
      align: 'center',
    }).setOrigin(0.5);
    const captionAVotes = this.add.text(-90, 50, `${data.votesA} votes`, {
      fontSize: '14px',
      color: data.votesA > data.votesB ? '#ffffff' : '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const captionAName = this.add.text(-90, -25, data.captionA?.playerName || '', {
      fontSize: '14px',
      color: '#dc2626',
    }).setOrigin(0.5);

    // Caption B result
    const captionBBg = this.add.rectangle(90, 20, 160, 80,
      data.votesB > data.votesA ? 0x22c55e : COLORS.panel);
    const captionBText = this.add.text(90, 10, `"${data.captionB?.text || ''}"`, {
      fontSize: '12px',
      color: data.votesB > data.votesA ? '#ffffff' : '#171717',
      wordWrap: { width: 140 },
      align: 'center',
    }).setOrigin(0.5);
    const captionBVotes = this.add.text(90, 50, `${data.votesB} votes`, {
      fontSize: '14px',
      color: data.votesB > data.votesA ? '#ffffff' : '#171717',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const captionBName = this.add.text(90, -25, data.captionB?.playerName || '', {
      fontSize: '14px',
      color: '#dc2626',
    }).setOrigin(0.5);

    this.resultContainer.add([
      winnerText,
      captionABg, captionAText, captionAVotes, captionAName,
      captionBBg, captionBText, captionBVotes, captionBName,
    ]);

    this.resultContainer.setVisible(true);
    this.statusText.setText(`Matchup ${data.matchupIndex} of ${data.matchupTotal}`);
  }

  private showRoundSummary(data: PhaseData) {
    this.summaryContainer.removeAll(true);

    // Title
    const title = this.add.text(0, -120, `Round ${data.round} Complete!`, {
      fontSize: '28px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.summaryContainer.add(title);

    // Scores
    if (data.scores) {
      const myEntry = data.scores.find(s => s.name === this.playerName);
      if (myEntry) {
        this.myScore = myEntry.score;
        this.updateHeader();
      }

      data.scores.slice(0, 5).forEach((entry, i) => {
        const y = -60 + (i * 40);
        const isMe = entry.name === this.playerName;

        const rank = this.add.text(-120, y, `${i + 1}.`, {
          fontSize: '18px',
          color: isMe ? '#fbbf24' : '#6b7280',
        });

        const name = this.add.text(-90, y, entry.name, {
          fontSize: '18px',
          color: isMe ? '#fbbf24' : '#171717',
          fontStyle: isMe ? 'bold' : 'normal',
        });

        const score = this.add.text(100, y, entry.score.toString(), {
          fontSize: '18px',
          color: '#22c55e',
          fontStyle: 'bold',
        });

        if (entry.roundScore && entry.roundScore > 0) {
          const delta = this.add.text(140, y, `+${entry.roundScore}`, {
            fontSize: '14px',
            color: '#dc2626',
          });
          this.summaryContainer.add(delta);
        }

        this.summaryContainer.add([rank, name, score]);
      });
    }

    this.summaryContainer.setVisible(true);
    this.statusText.setText('Waiting for next round...');
    this.timerText.setText('');
  }

  // ============ HELPERS ============

  private loadImage(imageUrl: string) {
    this.imageSprite?.destroy();

    const key = 'captionImage_' + Date.now();

    const displayImage = () => {
      this.imageSprite = this.add.image(0, -20, key);
      const maxWidth = 340;
      const maxHeight = 200;
      const scaleX = maxWidth / this.imageSprite.width;
      const scaleY = maxHeight / this.imageSprite.height;
      const scale = Math.min(scaleX, scaleY, 1);
      this.imageSprite.setScale(scale);
      this.contentContainer.add(this.imageSprite);
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

  private returnToLobby() {
    this.cleanupSocketListeners();
    this.scene.stop();
    this.scene.resume('LobbyScene');
  }

  private cleanupSocketListeners() {
    this.socket.off('cap:phase-changed');
    this.socket.off('cap:timer');
    this.socket.off('cap:submission-received');
    this.socket.off('cap:vote-update');
    this.socket.off('game:state');
    this.socket.off('game:ended');
    this.socket.off('game:left');
  }

  shutdown() {
    this.cleanupSocketListeners();
  }
}
