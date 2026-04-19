/**
 * Game manifest — registers all games with metadata (eager) and
 * dynamic import loaders (lazy). No game component code is pulled
 * into the main bundle; each game becomes its own chunk.
 */
import { registerGame, registerAlias } from './game-registry';
import type { GameCategory } from '@/types';

interface Entry {
  name: string;
  emoji: string;
  description: string;
  category: GameCategory;
  stages: number;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
  benefits?: string[];
  duration?: string;
  bestFor?: string[];
  minPlayers?: number;
  maxPlayers?: number;
}

function reg(id: string, meta: Entry, loader: () => Promise<{ default: any }>) {
  registerGame(id, meta, loader);
}

// ── Brain games ──────────────────────────────────────────────────
reg('copy-cat', {
  name: 'Copy Cat', emoji: '🐱',
  description: 'Watch the pattern, then repeat it! Just like Simon Says.',
  category: 'memory', stages: 99,
}, () => import('@/games/copy-cat'));

reg('memory-match', {
  name: 'Memory Match', emoji: '🃏',
  description: 'Flip cards and find the matching pairs!',
  category: 'memory', stages: 99,
}, () => import('@/games/memory-match'));

reg('number-ninja', {
  name: 'Number Ninja', emoji: '🔢',
  description: 'Memorize the numbers, then type them back!',
  category: 'memory', stages: 99,
}, () => import('@/games/number-ninja'));

reg('reverse-cat', {
  name: 'Reverse Cat', emoji: '🔄',
  description: 'Watch the pattern, then repeat it BACKWARDS!',
  category: 'memory', stages: 99,
}, () => import('@/games/reverse-cat'));

reg('echo-tap', {
  name: 'Echo Tap', emoji: '🥁',
  description: 'Tap the buttons to match the rhythm pattern!',
  category: 'focus', stages: 99,
}, () => import('@/games/echo-tap'));

reg('mirror-match', {
  name: 'Mirror Match', emoji: '🪞',
  description: 'Two grids flash — spot the differences before they vanish!',
  category: 'focus', stages: 99,
}, () => import('@/games/mirror-match'));

reg('focus-frenzy', {
  name: 'Focus Frenzy', emoji: '🔮',
  description: 'Tap the glowing orbs, but ignore the tricky distractions!',
  category: 'focus', stages: 99,
}, () => import('@/games/focus-frenzy'));

reg('patience-pop', {
  name: 'Patience Pop', emoji: '🫧',
  description: 'Wait for the bubbles to turn green, then pop them!',
  category: 'focus', stages: 99,
}, () => import('@/games/patience-pop'));

reg('attention-archery', {
  name: 'Attention Archery', emoji: '🏹',
  description: 'Hit the right targets! Watch out for sneaky decoys.',
  category: 'focus', stages: 99,
}, () => import('@/games/attention-archery'));

reg('breath-bubbles', {
  name: 'Breath Bubbles', emoji: '🫧',
  description: 'Blow perfect bubbles by breathing slow and steady!',
  category: 'focus', stages: 99,
}, () => import('@/games/breath-bubbles'));

reg('steady-hands', {
  name: 'Steady Hands', emoji: '🎯',
  description: 'Guide the ball through the winding path without touching the walls!',
  category: 'motor', stages: 99,
}, () => import('@/games/steady-hands'));

reg('pixel-paint', {
  name: 'Pixel Paint', emoji: '🟦',
  description: 'Tap the squares to match the pixel art picture!',
  category: 'motor', stages: 99,
}, () => import('@/games/pixel-paint'));

reg('pattern-painter', {
  name: 'Pattern Painter', emoji: '🎨',
  description: 'Trace the shapes with your finger or mouse!',
  category: 'motor', stages: 99,
}, () => import('@/games/pattern-painter'));

reg('flexibility-frames', {
  name: 'Flexibility Frames', emoji: '🔄',
  description: 'The rules keep changing! Stay flexible and adapt!',
  category: 'flexibility', stages: 99,
}, () => import('@/games/flexibility-frames'));

reg('mistake-master', {
  name: 'Mistake Master', emoji: '🌱',
  description: 'Learn from mistakes and grow! Every oops is a chance to learn.',
  category: 'flexibility', stages: 99,
}, () => import('@/games/mistake-master'));

reg('squish-lab', {
  name: 'Squish Lab', emoji: '🧪',
  description: 'Touch the squishy experiments! Some feel weird — see how long you can last.',
  category: 'flexibility', stages: 99,
}, () => import('@/games/squish-lab'));

reg('emotion-volcano', {
  name: 'Emotion Volcano', emoji: '🌋',
  description: 'Keep your volcano calm! Learn to cool down big feelings.',
  category: 'social', stages: 99,
}, () => import('@/games/emotion-volcano'));

reg('empathy-engine', {
  name: 'Empathy Engine', emoji: '💝',
  description: 'Help your friends by choosing the best response!',
  category: 'social', stages: 99,
}, () => import('@/games/empathy-engine'));

reg('feelings-faces', {
  name: 'Feelings Faces', emoji: '😊',
  description: "Match the emotion to what's happening!",
  category: 'social', stages: 99,
}, () => import('@/games/feelings-faces'));

reg('story-builder', {
  name: 'Story Builder', emoji: '📖',
  description: 'Arrange the comic panels to tell the story!',
  category: 'sequence', stages: 99,
}, () => import('@/games/story-builder'));

reg('routine-roadmap', {
  name: 'Routine Roadmap', emoji: '📋',
  description: 'Put the daily tasks in the right order!',
  category: 'sequence', stages: 99,
}, () => import('@/games/routine-roadmap'));

reg('just-right', {
  name: 'Just Right', emoji: '🎨',
  description: 'Splatter paint and stop when it looks just right!',
  category: 'flexibility', stages: 99,
}, () => import('@/games/just-right'));

reg('stroop-challenge', {
  name: 'Stroop Challenge', emoji: '🧩',
  description: 'The word says one color but the ink is another — can your brain keep up?',
  category: 'flexibility', stages: 99,
}, () => import('@/games/stroop-challenge'));

reg('quick-math', {
  name: 'Quick Math', emoji: '🧮',
  description: 'Rapid-fire arithmetic — speed and streaks earn big points!',
  category: 'focus', stages: 99,
}, () => import('@/games/quick-math'));

// ── Board games ──────────────────────────────────────────────────
reg('tic-tac-toe', {
  name: 'Tic-Tac-Toe', emoji: '⭕',
  description: 'Classic X and O — beat the AI!',
  category: 'board', stages: 99, aiDifficulty: 'medium',
  minPlayers: 2, maxPlayers: 2,
}, () => import('@/games/tic-tac-toe'));

reg('checkers', {
  name: 'Checkers', emoji: '⬤',
  description: 'Jump and capture your way to victory!',
  category: 'board', stages: 99, aiDifficulty: 'medium',
  minPlayers: 2, maxPlayers: 2,
}, () => import('@/games/checkers'));

reg('chess', {
  name: 'Chess', emoji: '♔',
  description: 'The royal game — checkmate the AI king!',
  category: 'board', stages: 99, aiDifficulty: 'medium',
  minPlayers: 2, maxPlayers: 2,
}, () => import('@/games/chess'));

reg('connect-four', {
  name: 'Connect Four', emoji: '🟡',
  description: 'Drop discs to connect four in a row!',
  category: 'board', stages: 99, aiDifficulty: 'medium',
  minPlayers: 2, maxPlayers: 2,
}, () => import('@/games/connect-four'));

reg('ludo', {
  name: 'Ludo', emoji: '🎲',
  description: 'Roll the dice and race your token home!',
  category: 'board', stages: 99, aiDifficulty: 'medium',
  minPlayers: 2, maxPlayers: 4,
}, () => import('@/games/ludo'));

reg('snakes-ladders', {
  name: 'Snakes & Ladders', emoji: '🐍',
  description: 'Classic race game — climb ladders, dodge snakes!',
  category: 'board', stages: 99, aiDifficulty: 'medium',
  minPlayers: 2, maxPlayers: 4,
}, () => import('@/games/snakes-ladders'));

reg('crossword', {
  name: 'Crossword', emoji: '📝',
  description: 'Solve crossword puzzles — tap to enter letters!',
  category: 'board', stages: 99, aiDifficulty: 'medium',
}, () => import('@/features/crossword/index'));

reg('wordsearch', {
  name: 'Word Search', emoji: '🔍',
  description: 'Find hidden words in a letter grid!',
  category: 'board', stages: 99, aiDifficulty: 'medium',
}, () => import('@/features/wordsearch/index'));

reg('flag-match', {
  name: 'Flag Match', emoji: '🚩',
  description: 'Match flags to their countries!',
  category: 'memory', stages: 99, aiDifficulty: 'medium',
}, () => import('@/games/flag-match'));

reg('fill-blank', {
  name: 'Fill in the Blank', emoji: '✏️',
  description: 'Pick a theme and fill in missing letters. Endless mode!',
  category: 'memory', stages: 99, aiDifficulty: 'medium',
}, () => import('@/games/fill-blank'));

reg('bingo', {
  name: 'Bingo', emoji: '🎱',
  description: 'Match numbers and complete your card!',
  category: 'board', stages: 99, aiDifficulty: 'medium',
  minPlayers: 2, maxPlayers: 8,
}, () => import('@/games/bingo'));

reg('uno', {
  name: 'UNO', emoji: '🃏',
  description: 'Match colors and numbers — be first to empty your hand!',
  category: 'board', stages: 99, aiDifficulty: 'medium',
  minPlayers: 2, maxPlayers: 4,
}, () => import('@/games/uno'));

reg('scrabble', {
  name: 'Scrabble', emoji: '🔤',
  description: 'Build words on the board for maximum points!',
  category: 'board', stages: 99, aiDifficulty: 'medium',
  minPlayers: 2, maxPlayers: 4,
}, () => import('@/games/scrabble'));

reg('bookworm', {
  name: 'Bookworm', emoji: '🐛',
  description: 'Chain adjacent letter tiles to spell words. Longer words = big points!',
  category: 'board', stages: 99,
}, () => import('@/games/bookworm'));

reg('connect-lines', {
  name: 'Connect Lines', emoji: '🔌',
  description: 'Rotate pipe tiles until every connection matches — no dead ends!',
  category: 'board', stages: 99,
}, () => import('@/games/connect-lines'));

// ── Breathing exercises ──────────────────────────────────────────
reg('box-breathing', {
  name: 'Box Breathing', emoji: '📦',
  description: '4-4-4-4 breathing pattern for calm and focus',
  category: 'breathe', stages: 99,
  benefits: ['Reduces stress', 'Lowers heart rate', 'Improves focus', 'Used by Navy SEALs'],
  duration: '3-13 min',
  bestFor: ['Stress relief', 'Pre-exam calm', 'Daily mindfulness'],
}, () => import('@/games/box-breathing'));

reg('calm-breathing', {
  name: '4-7-8 Calm', emoji: '🌊',
  description: 'Inhale 4s, hold 7s, exhale 8s — reduces anxiety',
  category: 'breathe', stages: 99,
  benefits: ['Reduces anxiety', 'Aids sleep', 'Calms nervous system', 'Manages cravings'],
  duration: '1-7 min',
  bestFor: ['Bedtime routine', 'Anxiety relief', 'Quick calming'],
}, () => import('@/games/calm-breathing'));

reg('triangle-breathing', {
  name: 'Triangle Breathing', emoji: '🔺',
  description: 'Equal inhale-hold-exhale, visual triangle guide',
  category: 'breathe', stages: 99,
  benefits: ['Grounding', 'Mental clarity', 'Beginner friendly', 'Breath awareness'],
  duration: '2-14 min',
  bestFor: ['Beginners', 'Quick reset', 'Pre-focus sessions'],
}, () => import('@/games/triangle-breathing'));

reg('coherent-breathing', {
  name: 'Coherent Breathing', emoji: '☯️',
  description: 'Equal inhale-exhale for heart-breath sync',
  category: 'breathe', stages: 99,
  benefits: ['HRV optimization', 'Parasympathetic activation', 'Blood pressure control', 'Sustained energy'],
  duration: '2-12 min',
  bestFor: ['Daily practice', 'Heart health', 'Post-exercise recovery'],
}, () => import('@/games/coherent-breathing'));

// ── URL aliases ──────────────────────────────────────────────────
registerAlias('word-search', 'wordsearch');
registerAlias('snakes-and-ladders', 'snakes-ladders');
