import { registerGame } from '@/lib/game-registry';
import CrosswordGame from './index';

registerGame('crossword', {
  name: 'Crossword',
  emoji: '📝',
  description: 'Solve crossword puzzles — tap to enter letters!',
  category: 'board',
  stages: 10,
  component: CrosswordGame,
  aiDifficulty: 'medium',
});
