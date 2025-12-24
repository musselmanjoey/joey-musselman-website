/**
 * Mock data for debug mode
 *
 * Each game defines its phases and mock data for each phase/role combination.
 * This allows Playwright to screenshot each state without running the full game.
 */

export interface GameMockData {
  phase: string;
  [key: string]: unknown;
}

// Game phase definitions
const GAME_PHASES: Record<string, string[]> = {
  'about-you': ['lobby', 'answering', 'reveal', 'round-summary', 'game-over'],
  'board-game': ['lobby', 'rolling', 'moving', 'minigame', 'results'],
  'caption-contest': ['lobby', 'captioning', 'voting', 'results', 'game-over'],
};

// Mock players for testing
const MOCK_PLAYERS = [
  { id: 'player-1', name: 'Alice' },
  { id: 'player-2', name: 'Bob' },
  { id: 'player-3', name: 'Charlie' },
  { id: 'player-4', name: 'Diana' },
];

const MOCK_SCORES = [
  { id: 'player-1', name: 'Alice', score: 3, isMainCharacter: true },
  { id: 'player-2', name: 'Bob', score: 2, isMainCharacter: false },
  { id: 'player-3', name: 'Charlie', score: 1, isMainCharacter: false },
  { id: 'player-4', name: 'Diana', score: 0, isMainCharacter: false },
];

// About You mock data
const ABOUT_YOU_MOCK: Record<string, Record<string, GameMockData>> = {
  lobby: {
    mc: {
      phase: 'lobby',
      isMainCharacter: true,
      mainCharacterId: 'player-1',
      mainCharacterName: 'Alice',
      players: MOCK_PLAYERS,
    },
    guesser: {
      phase: 'lobby',
      isMainCharacter: false,
      mainCharacterId: 'player-1',
      mainCharacterName: 'Alice',
      players: MOCK_PLAYERS,
    },
  },
  answering: {
    mc: {
      phase: 'answering',
      isMainCharacter: true,
      mainCharacterId: 'player-1',
      mainCharacterName: 'Alice',
      question: {
        id: 'q1',
        type: 'free',
        prompt: "If you won the lottery, what's the first thing you'd buy?",
      },
      questionNumber: 1,
      totalQuestions: 8,
      timer: 45,
      hasAnswered: false,
      myScore: 0,
    },
    guesser: {
      phase: 'answering',
      isMainCharacter: false,
      mainCharacterId: 'player-1',
      mainCharacterName: 'Alice',
      question: {
        id: 'q1',
        type: 'free',
        prompt: "If you won the lottery, what's the first thing you'd buy?",
      },
      questionNumber: 1,
      totalQuestions: 8,
      timer: 45,
      hasAnswered: false,
      myScore: 0,
    },
  },
  reveal: {
    mc: {
      phase: 'reveal',
      isMainCharacter: true,
      mainCharacterId: 'player-1',
      mainCharacterName: 'Alice',
      question: {
        id: 'q1',
        type: 'free',
        prompt: "If you won the lottery, what's the first thing you'd buy?",
      },
      questionNumber: 1,
      totalQuestions: 8,
      mainCharacterAnswer: 'A house for my parents',
      guesses: [
        { playerId: 'player-2', playerName: 'Bob', guess: 'A house for my parents' },
        { playerId: 'player-3', playerName: 'Charlie', guess: 'A fancy car' },
        { playerId: 'player-4', playerName: 'Diana', guess: 'Pay off debt' },
      ],
      matches: ['player-2'],
      approvedGuesses: [],
      myScore: 0,
    },
    guesser: {
      phase: 'reveal',
      isMainCharacter: false,
      mainCharacterId: 'player-1',
      mainCharacterName: 'Alice',
      question: {
        id: 'q1',
        type: 'free',
        prompt: "If you won the lottery, what's the first thing you'd buy?",
      },
      questionNumber: 1,
      totalQuestions: 8,
      mainCharacterAnswer: 'A house for my parents',
      guesses: [
        { playerId: 'player-2', playerName: 'Bob', guess: 'A house for my parents' },
        { playerId: 'player-3', playerName: 'Charlie', guess: 'A fancy car' },
        { playerId: 'player-4', playerName: 'Diana', guess: 'Pay off debt' },
      ],
      matches: ['player-2'],
      approvedGuesses: [],
      myAnswer: 'A fancy car',
      wasCorrect: false,
      myScore: 0,
    },
  },
  'round-summary': {
    mc: {
      phase: 'round-summary',
      isMainCharacter: true,
      questionNumber: 1,
      totalQuestions: 8,
      scores: MOCK_SCORES,
      isLastQuestion: false,
    },
    guesser: {
      phase: 'round-summary',
      isMainCharacter: false,
      questionNumber: 1,
      totalQuestions: 8,
      scores: MOCK_SCORES,
      isLastQuestion: false,
      myScore: 1,
    },
  },
  'game-over': {
    mc: {
      phase: 'game-over',
      isMainCharacter: true,
      mainCharacterName: 'Alice',
      winner: { id: 'player-2', name: 'Bob', score: 5 },
      finalScores: [
        { id: 'player-2', name: 'Bob', score: 5, isMainCharacter: false },
        { id: 'player-3', name: 'Charlie', score: 3, isMainCharacter: false },
        { id: 'player-4', name: 'Diana', score: 2, isMainCharacter: false },
        { id: 'player-1', name: 'Alice', score: 0, isMainCharacter: true },
      ],
    },
    guesser: {
      phase: 'game-over',
      isMainCharacter: false,
      mainCharacterName: 'Alice',
      winner: { id: 'player-2', name: 'Bob', score: 5 },
      finalScores: [
        { id: 'player-2', name: 'Bob', score: 5, isMainCharacter: false },
        { id: 'player-3', name: 'Charlie', score: 3, isMainCharacter: false },
        { id: 'player-4', name: 'Diana', score: 2, isMainCharacter: false },
        { id: 'player-1', name: 'Alice', score: 0, isMainCharacter: true },
      ],
      myScore: 3,
    },
  },
};

// All game mock data
const MOCK_DATA: Record<string, Record<string, Record<string, GameMockData>>> = {
  'about-you': ABOUT_YOU_MOCK,
  // Add other games here as needed
};

export function getPhases(game: string): string[] {
  return GAME_PHASES[game] || ['lobby'];
}

export function getMockData(game: string, phase: string, role: string): GameMockData {
  const gameData = MOCK_DATA[game];
  if (!gameData) {
    return { phase };
  }

  const phaseData = gameData[phase];
  if (!phaseData) {
    return { phase };
  }

  return phaseData[role] || phaseData['guesser'] || { phase };
}

// Export for use in debug scenes
export { MOCK_PLAYERS, MOCK_SCORES };
