export interface GameDefinition {
  name: string;
  emoji: string;
  description: string;
  category: GameCategory;
  stages: number;
  component: React.ComponentType<GameProps>;
  benefits?: string[];
  duration?: string;
  bestFor?: string[];
  aiDifficulty?: 'easy' | 'medium' | 'hard';
  tabDescription?: string;
  tabBenefits?: string[];
}

/** Metadata-only definition used for game hub listing (no component import). */
export type GameMeta = Omit<GameDefinition, 'component'>;

export interface GameProps {
  stage: number;
  onScore: (points: number) => void;
  onProgress: (pct: number) => void;
  onMessage: (msg: string) => void;
  onEnd: (result: GameResult) => void;
  multiplayerState?: MultiplayerState;
  onMultiplayerMove?: (move: unknown) => void;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface GameResult {
  score: number;
  stars: number;
  summary: string;
}

export interface MultiplayerState {
  sessionId: string;
  playerNumber: 1 | 2;
  currentPlayer: 1 | 2;
  boardState: unknown;
  opponentName: string;
  opponentAvatar: string;
  status: 'waiting' | 'playing' | 'finished';
  winner?: 1 | 2 | 'draw';
}

export type GameCategory =
  | 'focus'
  | 'memory'
  | 'motor'
  | 'flexibility'
  | 'social'
  | 'sequence'
  | 'board'
  | 'breathe';

export interface Player {
  playerId: string;
  name: string;
  avatar: string;
  pin?: string;
}

export interface Track {
  id: string;
  name: string;
  emoji: string;
  type: 'lofi' | 'focus' | 'nature' | 'meditation';
  bpm?: number;
  duration?: number;
  description: string;
}

export interface Playlist {
  _id: string;
  playerId: string;
  name: string;
  trackIds: string[];
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FeedPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  type: string;
  content: string;
  gameId?: string;
  gameName?: string;
  gameEmoji?: string;
  stage?: number;
  stars?: number;
  createdAt: number;
}

export interface MultiplayerInvite {
  _id: string;
  gameId: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  toId?: string;
  toName?: string;
  inviteCode: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: number;
  expiresAt: number;
}

export interface MultiplayerSession {
  _id: string;
  gameId: string;
  player1Id: string;
  player1Name: string;
  player1Avatar: string;
  player2Id?: string;
  player2Name?: string;
  player2Avatar?: string;
  boardState: unknown;
  currentPlayer: number;
  status: 'waiting' | 'playing' | 'finished';
  winner?: number;
  moves: unknown[];
  createdAt: number;
  updatedAt: number;
}

export const GAME_CATEGORIES: { id: GameCategory; label: string; emoji: string }[] = [
  { id: 'focus', label: 'Focus', emoji: '🎯' },
  { id: 'memory', label: 'Memory', emoji: '🧠' },
  { id: 'motor', label: 'Motor', emoji: '🖐️' },
  { id: 'flexibility', label: 'Flexibility', emoji: '🔄' },
  { id: 'social', label: 'Social', emoji: '💛' },
  { id: 'sequence', label: 'Sequence', emoji: '🔢' },
  { id: 'board', label: 'Board', emoji: '🎲' },
  { id: 'breathe', label: 'Breathe', emoji: '🌬️' },
];
