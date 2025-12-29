// Game-related types for Clown Club

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

export interface GamePlayer {
  id: string;
  name: string;
}

export interface GameStartedData {
  gameType: string;
  gameName: string;
  players: GamePlayer[];
  isHost: boolean;
}

export interface GameEndedData {
  roomCode: string;
}

export interface InteractionResult {
  objectId: string;
  success: boolean;
  action?: 'zone-change' | 'launch-game' | 'under-construction' | 'none' | 'browse-vinyl' | 'playback-controls' | 'view-reviews';
  targetZone?: string;
  gameType?: string;
  label?: string;
  message?: string;
  availableGames?: GameInfo[];
}

// Board Game specific types
export interface BoardPosition {
  playerId: string;
  playerName: string;
  position: number;
  color: string;
}

export interface BoardMovement {
  playerId: string;
  playerName: string;
  color: string;
  roll: number;
  startPosition: number;
  endPosition: number;
  finalPosition: number;
  trigger?: {
    type: 'ladder' | 'chute';
    name: string;
    from: number;
    to: number;
  };
}

export interface TriviaQuestion {
  question: string;
  options: { id: string; text: string }[];
}

export interface BoardGameState {
  state: 'rolling' | 'moving' | 'trivia' | 'results' | 'gameover';
  round: number;
  myPosition?: number;
  myColor?: string;
  hasRolled?: boolean;
  myRoll?: number;
  trivia?: TriviaQuestion;
  hasAnswered?: boolean;
  standings: BoardPosition[];
}

// Caption Contest specific types
export interface CaptionSubmission {
  caption: string;
  playerId: string;
}

export interface CaptionGameState {
  state: 'submitting' | 'voting' | 'results';
  round: number;
  currentImage: string;
  hasSubmitted?: boolean;
  hasVoted?: boolean;
  submissions?: CaptionSubmission[];
  myScore?: number;
}
