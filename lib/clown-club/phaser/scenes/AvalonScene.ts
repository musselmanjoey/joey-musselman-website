import * as Phaser from 'phaser';
import { Socket } from 'socket.io-client';

/**
 * AvalonScene - Single scene for all Avalon players (no separate host view)
 *
 * First player is host with game configuration controls.
 * Phases: lobby → night → team-building → voting → quest → quest-result → assassination → game-over
 *
 * Uses 'av:' prefix for socket events
 */

// Types
interface PlayerInfo {
  id: string;
  name: string;
  isLeader?: boolean;
  isOnTeam?: boolean;
}

interface Role {
  id: string;
  name: string;
  team: 'good' | 'evil';
  description: string;
  canAssassinate?: boolean;
}

interface RoleDefinition {
  id: string;
  team: 'good' | 'evil';
  name: string;
  description: string;
}

interface ValidRoles {
  good: RoleDefinition[];
  evil: RoleDefinition[];
  teamSize: { good: number; evil: number };
}

interface RolePreset {
  name: string;
  roles: string[];
  difficulty: number;
  description: string;
}

interface PhaseData {
  phase: string;
  hostId?: string;
  players?: PlayerInfo[];
  selectedRoles?: string[];
  difficultyModifier?: number;
  validRoles?: ValidRoles;
  teamSize?: { good: number; evil: number };
  presets?: Record<string, RolePreset>;
  minPlayers?: number;
  canStart?: boolean;
  seating?: PlayerInfo[];
  currentQuest?: number;
  questResults?: boolean[];
  leaderId?: string;
  leaderName?: string;
  proposedTeam?: PlayerInfo[];
  consecutiveRejections?: number;
  maxRejections?: number;
  timer?: number;
  questTeam?: PlayerInfo[];
  requiresTwoFails?: boolean;
  assassinId?: string;
  assassinName?: string;
  roleReveal?: Array<{ id: string; name: string; role: Role | null }>;
}

interface YourRoleData {
  role: Role;
  sees: PlayerInfo[];
  seesLabel: string;
}

interface VoteResultData {
  approved: boolean;
  approves: number;
  rejects: number;
  voteResults: Array<{ id: string; name: string; vote: boolean | null }>;
}

interface QuestCompleteData {
  questNumber: number;
  success: boolean;
  failCount: number;
  questResults: boolean[];
}

interface GameResultData {
  winner: 'good' | 'evil';
  reason: string;
}

interface AssassinationResultData {
  targetId: string;
  targetName: string;
  wasMerlin: boolean;
}

interface GameState {
  gameType: string;
  phase: string;
  isHost: boolean;
  hostId?: string;
  isLeader: boolean;
  leaderId?: string;
  isOnTeam: boolean;
  myRole: Role | null;
  visiblePlayers: PlayerInfo[];
  players?: PlayerInfo[];
  minPlayers?: number;
  canStart?: boolean;
  currentQuest: number;
  questResults: boolean[];
  seating: PlayerInfo[];
  proposedTeam: PlayerInfo[];
  hasVoted: boolean;
  hasSubmittedCard: boolean;
  consecutiveRejections: number;
  maxRejections: number;
  timer: number | null;
}

const COLORS = {
  background: 0x1a1a2e,    // Dark blue-purple
  panel: 0x16213e,         // Darker panel
  good: 0x3b82f6,          // Blue for good team
  evil: 0xdc2626,          // Red for evil team
  gold: 0xfbbf24,          // Gold for highlights
  success: 0x22c55e,       // Green
  text: 0xffffff,          // White text
  muted: 0x9ca3af,         // Gray text
  border: 0x374151,        // Gray border
};

// Portrait dimensions for mobile
const GAME_WIDTH = 400;
const GAME_HEIGHT = 700;

// World dimensions to restore on exit
const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;

export class AvalonScene extends Phaser.Scene {
  private socket!: Socket;
  private playerId!: string;
  private playerName!: string;

  // Game state
  private phase: string = '';
  private isHost: boolean = false;
  private isLeader: boolean = false;
  private myRole: Role | null = null;
  private visiblePlayers: PlayerInfo[] = [];
  private seating: PlayerInfo[] = [];
  private questResults: boolean[] = [];
  private currentQuest: number = 1;
  private proposedTeam: string[] = [];
  private selectedRoles: string[] = ['merlin', 'assassin'];
  private hasVoted: boolean = false;
  private hasSubmittedCard: boolean = false;

  // UI Elements
  private questTracker!: Phaser.GameObjects.Container;
  private seatingCircle!: Phaser.GameObjects.Container;
  private roleCard!: Phaser.GameObjects.Container;
  private actionArea!: Phaser.GameObjects.Container;
  private contentContainer!: Phaser.GameObjects.Container;
  private timerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('AvalonScene');
  }

  create() {
    this.socket = this.registry.get('socket');
    this.playerId = this.registry.get('playerId');
    this.playerName = this.registry.get('playerName') || 'Player';

    if (!this.socket) {
      this.add.text(200, 350, 'Connection error', { fontSize: '24px', color: '#ff0000' }).setOrigin(0.5);
      return;
    }

    // Resize to portrait mode
    this.scale.setGameSize(GAME_WIDTH, GAME_HEIGHT);
    this.scale.refresh();

    // Reset state
    this.phase = '';
    this.isHost = false;
    this.myRole = null;
    this.seating = [];
    this.questResults = [];
    this.proposedTeam = [];

    this.createUI();
    this.setupSocketListeners();
    this.socket.emit('game:request-state');
  }

  private createUI() {
    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);

    // Quest tracker (top)
    this.questTracker = this.add.container(GAME_WIDTH / 2, 50);
    this.createQuestTracker();

    // Timer (below quest tracker)
    this.timerText = this.add.text(GAME_WIDTH / 2, 100, '', {
      fontSize: '32px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Seating circle (middle)
    this.seatingCircle = this.add.container(GAME_WIDTH / 2, 280);

    // Content container (for phase-specific content)
    this.contentContainer = this.add.container(GAME_WIDTH / 2, 350);

    // Role card (lower)
    this.roleCard = this.add.container(GAME_WIDTH / 2, 520);
    this.roleCard.setVisible(false);

    // Action area (bottom)
    this.actionArea = this.add.container(GAME_WIDTH / 2, 610);

    // Status text
    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '', {
      fontSize: '14px',
      color: '#9ca3af',
      align: 'center',
    }).setOrigin(0.5);

    // Leave button
    this.createButton(GAME_WIDTH - 50, 30, 'Leave', () => {
      this.socket.emit('game:leave');
    }, COLORS.evil, 70, 28, '12px');
  }

  private createQuestTracker() {
    this.questTracker.removeAll(true);

    const spacing = 60;
    const startX = -2 * spacing;

    for (let i = 0; i < 5; i++) {
      const x = startX + i * spacing;
      const result = this.questResults[i];

      // Circle background
      const circle = this.add.circle(x, 0, 22, COLORS.panel);
      circle.setStrokeStyle(3, COLORS.border);

      // Quest number
      const num = this.add.text(x, 0, `${i + 1}`, {
        fontSize: '18px',
        color: '#9ca3af',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Result indicator
      if (result !== undefined) {
        circle.setFillStyle(result ? COLORS.success : COLORS.evil);
        num.setColor('#ffffff');
      } else if (i === this.currentQuest - 1) {
        circle.setStrokeStyle(3, COLORS.gold);
      }

      this.questTracker.add([circle, num]);
    }
  }

  private createSeatingCircle(players: PlayerInfo[], interactive: boolean = false) {
    this.seatingCircle.removeAll(true);

    if (players.length === 0) return;

    const radius = 100;
    const angleStep = (2 * Math.PI) / players.length;

    players.forEach((player, i) => {
      const angle = -Math.PI / 2 + i * angleStep; // Start from top
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // Player circle
      const isMe = player.id === this.playerId;
      const isOnTeam = this.proposedTeam.includes(player.id);
      const isLeader = player.isLeader;

      let bgColor = COLORS.panel;
      if (isOnTeam) bgColor = COLORS.gold;

      const circle = this.add.circle(x, y, 28, bgColor);
      circle.setStrokeStyle(isMe ? 4 : 2, isMe ? COLORS.good : COLORS.border);

      // Leader crown
      if (isLeader) {
        const crown = this.add.text(x, y - 42, '👑', { fontSize: '20px' }).setOrigin(0.5);
        this.seatingCircle.add(crown);
      }

      // Player name (truncated)
      const displayName = player.name.length > 8 ? player.name.slice(0, 7) + '…' : player.name;
      const nameText = this.add.text(x, y + 45, displayName, {
        fontSize: '12px',
        color: isMe ? '#3b82f6' : '#ffffff',
        fontStyle: isMe ? 'bold' : 'normal',
      }).setOrigin(0.5);

      // Initial in circle
      const initial = this.add.text(x, y, player.name.charAt(0).toUpperCase(), {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.seatingCircle.add([circle, nameText, initial]);

      // Interactive (for team selection or assassination)
      if (interactive && player.id !== this.playerId) {
        circle.setInteractive({ useHandCursor: true });

        circle.on('pointerover', () => {
          circle.setStrokeStyle(3, COLORS.gold);
        });

        circle.on('pointerout', () => {
          const selected = this.proposedTeam.includes(player.id);
          circle.setStrokeStyle(selected ? 3 : 2, selected ? COLORS.gold : COLORS.border);
          if (selected) circle.setFillStyle(COLORS.gold);
        });

        circle.on('pointerdown', () => {
          this.handlePlayerClick(player.id);
        });
      }
    });
  }

  private handlePlayerClick(playerId: string) {
    if (this.phase === 'team-building' && this.isLeader) {
      // Toggle player on/off team
      const index = this.proposedTeam.indexOf(playerId);
      if (index === -1) {
        this.proposedTeam.push(playerId);
      } else {
        this.proposedTeam.splice(index, 1);
      }

      // Update server with current selection
      this.socket.emit('av:update-team', { playerIds: this.proposedTeam });

      // Redraw seating circle
      this.createSeatingCircle(this.seating, true);
      this.updateTeamBuildingUI();
    } else if (this.phase === 'assassination') {
      // Assassinate target
      this.socket.emit('av:assassinate', { targetId: playerId });
    }
  }

  private updateTeamBuildingUI() {
    // Update the propose button state
    const teamSizeNeeded = this.getRequiredTeamSize();
    const canPropose = this.proposedTeam.length === teamSizeNeeded;

    this.actionArea.removeAll(true);

    if (this.isLeader) {
      const countText = this.add.text(0, -30, `Select ${teamSizeNeeded} players (${this.proposedTeam.length}/${teamSizeNeeded})`, {
        fontSize: '16px',
        color: this.proposedTeam.length === teamSizeNeeded ? '#22c55e' : '#9ca3af',
      }).setOrigin(0.5);

      const proposeBtn = this.createButton(0, 20, 'PROPOSE TEAM', () => {
        if (canPropose) {
          this.socket.emit('av:propose-team', { playerIds: this.proposedTeam });
        }
      }, canPropose ? COLORS.good : COLORS.panel, 200, 50, '18px');

      if (!canPropose) {
        proposeBtn.setAlpha(0.5);
      }

      this.actionArea.add([countText, proposeBtn]);
    } else {
      const waitText = this.add.text(0, 0, 'Waiting for leader...', {
        fontSize: '18px',
        color: '#9ca3af',
      }).setOrigin(0.5);
      this.actionArea.add(waitText);
    }
  }

  private getRequiredTeamSize(): number {
    // Team sizes by player count and quest
    const sizes: Record<number, number[]> = {
      5: [2, 3, 2, 3, 3],
      6: [2, 3, 4, 3, 4],
      7: [2, 3, 3, 4, 4],
      8: [3, 4, 4, 5, 5],
      9: [3, 4, 4, 5, 5],
      10: [3, 4, 4, 5, 5],
    };

    const playerCount = this.seating.length;
    const questIndex = this.currentQuest - 1;

    return sizes[playerCount]?.[questIndex] || 2;
  }

  private createRoleCard(role: Role, visiblePlayers: PlayerInfo[]) {
    this.roleCard.removeAll(true);

    const bgColor = role.team === 'good' ? COLORS.good : COLORS.evil;
    const bg = this.add.rectangle(0, 0, GAME_WIDTH - 40, 100, bgColor, 0.3);
    bg.setStrokeStyle(2, bgColor);

    const teamEmoji = role.team === 'good' ? '🛡️' : '🗡️';
    const roleText = this.add.text(0, -30, `${teamEmoji} ${role.name}`, {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const teamText = this.add.text(0, 0, role.team.toUpperCase(), {
      fontSize: '14px',
      color: role.team === 'good' ? '#93c5fd' : '#fca5a5',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.roleCard.add([bg, roleText, teamText]);

    // Show visible players if any
    if (visiblePlayers.length > 0) {
      const seesText = this.add.text(0, 30, `You see: ${visiblePlayers.map(p => p.name).join(', ')}`, {
        fontSize: '12px',
        color: '#9ca3af',
        wordWrap: { width: GAME_WIDTH - 60 },
        align: 'center',
      }).setOrigin(0.5);
      this.roleCard.add(seesText);
    }

    this.roleCard.setVisible(true);
  }

  private createButton(
    x: number, y: number, text: string, onClick: () => void,
    color: number, width: number, height: number, fontSize: string = '18px'
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, width, height, color)
      .setStrokeStyle(2, 0xffffff, 0.2)
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

  // ============ SOCKET LISTENERS ============

  private setupSocketListeners() {
    this.socket.on('av:phase-changed', (data: PhaseData) => this.handlePhaseChange(data));
    this.socket.on('av:your-role', (data: YourRoleData) => this.handleYourRole(data));
    this.socket.on('av:timer', (data: { secondsLeft: number }) => this.updateTimer(data.secondsLeft));
    this.socket.on('av:team-update', (data: { proposedTeam: PlayerInfo[] }) => {
      this.proposedTeam = data.proposedTeam.map(p => p.id);
      this.createSeatingCircle(this.seating, this.phase === 'team-building' && this.isLeader);
    });
    this.socket.on('av:vote-progress', (data: { votesIn: number; totalPlayers: number }) => {
      this.statusText.setText(`Votes: ${data.votesIn}/${data.totalPlayers}`);
    });
    this.socket.on('av:vote-result', (data: VoteResultData) => this.handleVoteResult(data));
    this.socket.on('av:quest-progress', (data: { cardsIn: number; teamSize: number }) => {
      this.statusText.setText(`Cards: ${data.cardsIn}/${data.teamSize}`);
    });
    this.socket.on('av:quest-complete', (data: QuestCompleteData) => this.handleQuestComplete(data));
    this.socket.on('av:game-result', (data: GameResultData) => this.handleGameResult(data));
    this.socket.on('av:assassination-result', (data: AssassinationResultData) => this.handleAssassinationResult(data));

    this.socket.on('game:state', (state: GameState) => {
      if (state.gameType !== 'avalon') return;
      this.isHost = state.isHost;
      this.isLeader = state.isLeader;
      this.myRole = state.myRole;
      this.visiblePlayers = state.visiblePlayers || [];
      this.questResults = state.questResults || [];
      this.currentQuest = state.currentQuest || 1;
      this.seating = state.seating || [];
      this.proposedTeam = state.proposedTeam?.map(p => p.id) || [];
      this.hasVoted = state.hasVoted;
      this.hasSubmittedCard = state.hasSubmittedCard;

      if (this.myRole) {
        this.createRoleCard(this.myRole, this.visiblePlayers);
      }
      this.createQuestTracker();

      // Display the current phase UI (handles case where av:phase-changed was missed)
      if (state.phase && state.phase !== this.phase) {
        this.handlePhaseChange({
          phase: state.phase,
          // Don't pass hostId - isHost is already set from state.isHost above
          players: state.players,
          seating: state.seating,
          questResults: state.questResults,
          currentQuest: state.currentQuest,
          proposedTeam: state.proposedTeam,
          leaderId: state.leaderId,
          minPlayers: state.minPlayers,
          canStart: state.canStart,
        });
      }
    });

    this.socket.on('game:ended', () => this.returnToLobby());
    this.socket.on('game:left', () => this.returnToLobby());
  }

  private handlePhaseChange(data: PhaseData) {
    this.phase = data.phase;

    if (data.hostId) this.isHost = data.hostId === this.playerId;
    if (data.seating) this.seating = data.seating;
    if (data.questResults) {
      this.questResults = data.questResults;
      this.createQuestTracker();
    }
    if (data.currentQuest) this.currentQuest = data.currentQuest;
    if (data.proposedTeam) this.proposedTeam = data.proposedTeam.map(p => p.id);
    if (data.leaderId) this.isLeader = data.leaderId === this.playerId;

    // Reset per-phase state
    this.hasVoted = false;
    this.hasSubmittedCard = false;

    // Clear containers
    this.contentContainer.removeAll(true);
    this.actionArea.removeAll(true);
    this.timerText.setText('');
    this.statusText.setText('');

    if (data.timer) {
      this.updateTimer(data.timer);
    }

    switch (data.phase) {
      case 'lobby':
        this.showLobby(data);
        break;
      case 'night':
        this.showNight(data);
        break;
      case 'team-building':
        this.showTeamBuilding(data);
        break;
      case 'voting':
        this.showVoting(data);
        break;
      case 'quest':
        this.showQuest(data);
        break;
      case 'assassination':
        this.showAssassination(data);
        break;
      case 'game-over':
        this.showGameOver(data);
        break;
    }
  }

  private handleYourRole(data: YourRoleData) {
    this.myRole = data.role;
    this.visiblePlayers = data.sees;
    this.createRoleCard(data.role, data.sees);
  }

  private updateTimer(seconds: number) {
    this.timerText.setText(seconds > 0 ? `${seconds}s` : '');

    if (seconds <= 10 && seconds > 0) {
      this.timerText.setColor('#ef4444');
    } else if (seconds <= 30) {
      this.timerText.setColor('#fbbf24');
    } else {
      this.timerText.setColor('#fbbf24');
    }
  }

  // ============ PHASE DISPLAYS ============

  private showLobby(data: PhaseData) {
    this.questTracker.setVisible(false);
    this.seatingCircle.setVisible(false);
    this.roleCard.setVisible(false);

    const title = this.add.text(0, -100, '⚔️ AVALON ⚔️', {
      fontSize: '32px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const playerCount = data.players?.length || 0;
    const minPlayers = data.minPlayers || 5;

    const countText = this.add.text(0, -50, `Players: ${playerCount}/${minPlayers} minimum`, {
      fontSize: '18px',
      color: playerCount >= minPlayers ? '#22c55e' : '#9ca3af',
    }).setOrigin(0.5);

    this.contentContainer.add([title, countText]);

    // Player list
    if (data.players) {
      data.players.slice(0, 10).forEach((player, i) => {
        const y = -10 + i * 25;
        const isMe = player.id === this.playerId;
        const text = this.add.text(0, y, `${isMe ? '→ ' : ''}${player.name}${player.id === data.hostId ? ' (Host)' : ''}`, {
          fontSize: '14px',
          color: isMe ? '#3b82f6' : '#ffffff',
        }).setOrigin(0.5);
        this.contentContainer.add(text);
      });
    }

    // Host controls
    if (this.isHost && data.canStart) {
      const startBtn = this.createButton(0, 20, 'START GAME', () => {
        this.socket.emit('av:start-game');
      }, COLORS.success, 200, 50, '20px');
      this.actionArea.add(startBtn);

      // Role configuration hint
      const configHint = this.add.text(0, 60, 'Default: Merlin + Assassin', {
        fontSize: '12px',
        color: '#9ca3af',
      }).setOrigin(0.5);
      this.actionArea.add(configHint);
    } else if (!this.isHost) {
      const waitText = this.add.text(0, 20, 'Waiting for host to start...', {
        fontSize: '16px',
        color: '#9ca3af',
      }).setOrigin(0.5);
      this.actionArea.add(waitText);
    } else {
      const needMore = this.add.text(0, 20, `Need ${minPlayers - playerCount} more player(s)`, {
        fontSize: '16px',
        color: '#fbbf24',
      }).setOrigin(0.5);
      this.actionArea.add(needMore);
    }

    this.statusText.setText('Social deduction game');
  }

  private showNight(data: PhaseData) {
    this.questTracker.setVisible(true);
    this.seatingCircle.setVisible(false);

    // Role reveal is handled by av:your-role event
    const title = this.add.text(0, -80, '🌙 NIGHT PHASE', {
      fontSize: '28px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -40, 'Your role has been assigned', {
      fontSize: '16px',
      color: '#9ca3af',
    }).setOrigin(0.5);

    this.contentContainer.add([title, subtitle]);

    // Ready button
    const readyBtn = this.createButton(0, 20, 'CONTINUE', () => {
      this.socket.emit('av:night-ready');
      readyBtn.setAlpha(0.5);
    }, COLORS.good, 160, 45, '18px');
    this.actionArea.add(readyBtn);

    this.statusText.setText('Memorize your role and who you see');
  }

  private showTeamBuilding(data: PhaseData) {
    this.questTracker.setVisible(true);
    this.seatingCircle.setVisible(true);
    this.roleCard.setVisible(true);
    this.proposedTeam = [];

    // Create interactive seating circle for leader
    this.createSeatingCircle(this.seating, this.isLeader);

    const questText = this.add.text(0, -20, `Quest ${this.currentQuest}`, {
      fontSize: '24px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const leaderText = this.add.text(0, 10, `Leader: ${data.leaderName || 'Unknown'}`, {
      fontSize: '16px',
      color: this.isLeader ? '#22c55e' : '#9ca3af',
    }).setOrigin(0.5);

    this.contentContainer.add([questText, leaderText]);

    // Rejection tracker
    if (data.consecutiveRejections && data.consecutiveRejections > 0) {
      const rejectText = this.add.text(0, 40, `Rejections: ${data.consecutiveRejections}/${data.maxRejections}`, {
        fontSize: '14px',
        color: '#ef4444',
      }).setOrigin(0.5);
      this.contentContainer.add(rejectText);
    }

    this.updateTeamBuildingUI();
  }

  private showVoting(data: PhaseData) {
    this.questTracker.setVisible(true);
    this.seatingCircle.setVisible(true);
    this.roleCard.setVisible(true);

    this.createSeatingCircle(this.seating, false);

    const title = this.add.text(0, -40, 'VOTE ON TEAM', {
      fontSize: '22px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const teamNames = data.proposedTeam?.map(p => p.name).join(', ') || '';
    const teamText = this.add.text(0, 0, teamNames, {
      fontSize: '14px',
      color: '#ffffff',
      wordWrap: { width: GAME_WIDTH - 60 },
      align: 'center',
    }).setOrigin(0.5);

    this.contentContainer.add([title, teamText]);

    if (!this.hasVoted) {
      const approveBtn = this.createButton(-70, 0, '✓ APPROVE', () => {
        this.socket.emit('av:vote', { approve: true });
        this.hasVoted = true;
        this.showVotedState();
      }, COLORS.success, 120, 50, '16px');

      const rejectBtn = this.createButton(70, 0, '✗ REJECT', () => {
        this.socket.emit('av:vote', { approve: false });
        this.hasVoted = true;
        this.showVotedState();
      }, COLORS.evil, 120, 50, '16px');

      this.actionArea.add([approveBtn, rejectBtn]);
    } else {
      this.showVotedState();
    }
  }

  private showVotedState() {
    this.actionArea.removeAll(true);
    const votedText = this.add.text(0, 0, '✓ Vote submitted', {
      fontSize: '18px',
      color: '#22c55e',
    }).setOrigin(0.5);
    this.actionArea.add(votedText);
  }

  private handleVoteResult(data: VoteResultData) {
    this.contentContainer.removeAll(true);
    this.actionArea.removeAll(true);

    const resultText = data.approved ? '✓ APPROVED' : '✗ REJECTED';
    const resultColor = data.approved ? '#22c55e' : '#ef4444';

    const title = this.add.text(0, -30, resultText, {
      fontSize: '28px',
      color: resultColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const countText = this.add.text(0, 10, `Approve: ${data.approves} | Reject: ${data.rejects}`, {
      fontSize: '16px',
      color: '#9ca3af',
    }).setOrigin(0.5);

    this.contentContainer.add([title, countText]);
  }

  private showQuest(data: PhaseData) {
    this.questTracker.setVisible(true);
    this.seatingCircle.setVisible(true);
    this.roleCard.setVisible(true);

    this.createSeatingCircle(this.seating, false);

    const isOnTeam = data.questTeam?.some(p => p.id === this.playerId);

    const title = this.add.text(0, -40, `QUEST ${this.currentQuest}`, {
      fontSize: '24px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.contentContainer.add(title);

    if (data.requiresTwoFails) {
      const specialRule = this.add.text(0, -10, '⚠️ Requires 2 fails to fail', {
        fontSize: '14px',
        color: '#fbbf24',
      }).setOrigin(0.5);
      this.contentContainer.add(specialRule);
    }

    if (isOnTeam && !this.hasSubmittedCard) {
      const hint = this.add.text(0, 20, 'You are on the quest team!', {
        fontSize: '16px',
        color: '#22c55e',
      }).setOrigin(0.5);
      this.contentContainer.add(hint);

      const canFail = this.myRole?.team === 'evil';

      const successBtn = this.createButton(-70, 0, '✓ SUCCESS', () => {
        this.socket.emit('av:quest-card', { success: true });
        this.hasSubmittedCard = true;
        this.showCardSubmittedState();
      }, COLORS.success, 120, 50, '16px');

      this.actionArea.add(successBtn);

      if (canFail) {
        const failBtn = this.createButton(70, 0, '✗ FAIL', () => {
          this.socket.emit('av:quest-card', { success: false });
          this.hasSubmittedCard = true;
          this.showCardSubmittedState();
        }, COLORS.evil, 120, 50, '16px');
        this.actionArea.add(failBtn);
      }
    } else if (isOnTeam) {
      this.showCardSubmittedState();
    } else {
      const waitText = this.add.text(0, 0, 'Waiting for quest team...', {
        fontSize: '18px',
        color: '#9ca3af',
      }).setOrigin(0.5);
      this.actionArea.add(waitText);
    }
  }

  private showCardSubmittedState() {
    this.actionArea.removeAll(true);
    const text = this.add.text(0, 0, '✓ Card submitted', {
      fontSize: '18px',
      color: '#22c55e',
    }).setOrigin(0.5);
    this.actionArea.add(text);
  }

  private handleQuestComplete(data: QuestCompleteData) {
    this.questResults = data.questResults;
    this.createQuestTracker();

    this.contentContainer.removeAll(true);
    this.actionArea.removeAll(true);

    const result = data.success ? '✓ SUCCESS' : '✗ FAILED';
    const color = data.success ? '#22c55e' : '#ef4444';

    const title = this.add.text(0, -30, result, {
      fontSize: '32px',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const failText = this.add.text(0, 20, `Fail cards: ${data.failCount}`, {
      fontSize: '18px',
      color: '#9ca3af',
    }).setOrigin(0.5);

    this.contentContainer.add([title, failText]);
  }

  private showAssassination(data: PhaseData) {
    this.questTracker.setVisible(true);
    this.roleCard.setVisible(true);

    const isAssassin = this.myRole?.canAssassinate;
    const isEvil = this.myRole?.team === 'evil';

    // Create interactive seating for assassin
    this.createSeatingCircle(this.seating, isAssassin || false);
    this.seatingCircle.setVisible(true);

    const title = this.add.text(0, -60, '🗡️ ASSASSINATION', {
      fontSize: '26px',
      color: '#ef4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -20, 'Good team completed 3 quests!', {
      fontSize: '16px',
      color: '#22c55e',
    }).setOrigin(0.5);

    this.contentContainer.add([title, subtitle]);

    if (isAssassin) {
      const hint = this.add.text(0, 20, 'Choose who you think is Merlin', {
        fontSize: '16px',
        color: '#fbbf24',
      }).setOrigin(0.5);
      this.actionArea.add(hint);
    } else if (isEvil) {
      const waitText = this.add.text(0, 20, `Waiting for ${data.assassinName}...`, {
        fontSize: '16px',
        color: '#9ca3af',
      }).setOrigin(0.5);
      this.actionArea.add(waitText);
    } else {
      const waitText = this.add.text(0, 20, 'Evil is choosing their target...', {
        fontSize: '16px',
        color: '#ef4444',
      }).setOrigin(0.5);
      this.actionArea.add(waitText);
    }
  }

  private handleAssassinationResult(data: AssassinationResultData) {
    this.contentContainer.removeAll(true);
    this.actionArea.removeAll(true);

    const title = this.add.text(0, -40, `Target: ${data.targetName}`, {
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const result = data.wasMerlin
      ? '🗡️ MERLIN FOUND!'
      : '🛡️ MERLIN SURVIVED!';

    const color = data.wasMerlin ? '#ef4444' : '#22c55e';

    const resultText = this.add.text(0, 10, result, {
      fontSize: '28px',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.contentContainer.add([title, resultText]);
  }

  private handleGameResult(data: GameResultData) {
    this.contentContainer.removeAll(true);

    const emoji = data.winner === 'good' ? '🛡️' : '🗡️';
    const color = data.winner === 'good' ? '#3b82f6' : '#ef4444';
    const teamName = data.winner === 'good' ? 'GOOD' : 'EVIL';

    const title = this.add.text(0, -60, `${emoji} ${teamName} WINS! ${emoji}`, {
      fontSize: '28px',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const reason = this.add.text(0, -10, data.reason, {
      fontSize: '16px',
      color: '#9ca3af',
      wordWrap: { width: GAME_WIDTH - 60 },
      align: 'center',
    }).setOrigin(0.5);

    this.contentContainer.add([title, reason]);
  }

  private showGameOver(data: PhaseData) {
    this.questTracker.setVisible(true);
    this.seatingCircle.setVisible(false);

    const title = this.add.text(0, -100, 'GAME OVER', {
      fontSize: '32px',
      color: '#fbbf24',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -60, 'Role Reveal', {
      fontSize: '18px',
      color: '#9ca3af',
    }).setOrigin(0.5);

    this.contentContainer.add([title, subtitle]);

    // Show all roles
    if (data.roleReveal) {
      data.roleReveal.forEach((player, i) => {
        const y = -20 + i * 35;
        const isMe = player.id === this.playerId;
        const teamEmoji = player.role?.team === 'good' ? '🛡️' : '🗡️';
        const teamColor = player.role?.team === 'good' ? '#3b82f6' : '#ef4444';

        const text = this.add.text(0, y, `${teamEmoji} ${player.name}: ${player.role?.name || 'Unknown'}`, {
          fontSize: isMe ? '15px' : '14px',
          color: isMe ? teamColor : '#ffffff',
          fontStyle: isMe ? 'bold' : 'normal',
        }).setOrigin(0.5);

        this.contentContainer.add(text);
      });
    }

    this.roleCard.setVisible(false);

    this.statusText.setText('Thanks for playing!');
  }

  // ============ HELPERS ============

  private returnToLobby() {
    this.cleanupSocketListeners();
    this.scale.setGameSize(WORLD_WIDTH, WORLD_HEIGHT);
    this.scale.refresh();
    this.scene.stop();
    this.scene.resume('LobbyScene');
  }

  private cleanupSocketListeners() {
    this.socket.off('av:phase-changed');
    this.socket.off('av:your-role');
    this.socket.off('av:timer');
    this.socket.off('av:team-update');
    this.socket.off('av:vote-progress');
    this.socket.off('av:vote-result');
    this.socket.off('av:quest-progress');
    this.socket.off('av:quest-complete');
    this.socket.off('av:game-result');
    this.socket.off('av:assassination-result');
    this.socket.off('game:state');
    this.socket.off('game:ended');
    this.socket.off('game:left');
  }

  shutdown() {
    this.cleanupSocketListeners();
  }
}
