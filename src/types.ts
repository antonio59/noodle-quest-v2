export interface GameDefinition {
  name: string;
  emoji: string;
  description: string;
  category: GameCategory;
  stages: number;
  component: React.ComponentType<GameProps>;
}

export interface GameProps {
  stage: number;
  onScore: (points: number) => void;
  onProgress: (pct: number) => void;
  onMessage: (msg: string) => void;
  onEnd: (result: GameResult) => void;
}

export interface GameResult {
  score: number;
  stars: number;
  summary: string;
}

export type GameCategory =
  | 'focus'
  | 'memory'
  | 'motor'
  | 'flexibility'
  | 'social'
  | 'sequence'
  | 'board';

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

export const GAME_CATEGORIES: { id: GameCategory; label: string; emoji: string }[] = [
  { id: 'focus', label: 'Focus', emoji: '🎯' },
  { id: 'memory', label: 'Memory', emoji: '🧠' },
  { id: 'motor', label: 'Motor', emoji: '🖐️' },
  { id: 'flexibility', label: 'Flexibility', emoji: '🔄' },
  { id: 'social', label: 'Social', emoji: '💛' },
  { id: 'sequence', label: 'Sequence', emoji: '🔢' },
  { id: 'board', label: 'Board', emoji: '🎲' },
];
