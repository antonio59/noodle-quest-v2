import { registerGame } from '@/lib/game-registry';
import WordSearchGame from './index';

registerGame('wordsearch', {
  name: 'Word Search',
  emoji: '🔍',
  description: 'Find hidden words in a letter grid!',
  category: 'board',
  stages: 10,
  component: WordSearchGame,
  aiDifficulty: 'medium',
});
