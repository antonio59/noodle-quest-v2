import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ConvexClientProvider } from '@/lib/convex';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppRouter } from './App';

// Register games
import '@/games/copy-cat';
import '@/games/memory-match';
import '@/games/number-ninja';
import '@/games/reverse-cat';
import '@/games/echo-tap';
import '@/games/mirror-match';
import '@/games/focus-frenzy';
import '@/games/patience-pop';
import '@/games/attention-archery';
import '@/games/breath-bubbles';
import '@/games/steady-hands';
import '@/games/pixel-paint';
import '@/games/pattern-painter';
import '@/games/flexibility-frames';
import '@/games/mistake-master';
import '@/games/squish-lab';
import '@/games/emotion-volcano';
import '@/games/empathy-engine';
import '@/games/feelings-faces';
import '@/games/story-builder';
import '@/games/routine-roadmap';
import '@/games/just-right';
import '@/games/sudoku';
import '@/games/tetris-drop';
import '@/games/word-search';
import '@/games/boggle-rush';

// New cognitive games
import '@/games/crossword';
import '@/games/speed-math';
import '@/games/sequence-memory';
import '@/games/color-match';
import '@/games/reaction-time';
import '@/games/number-sequence';
import '@/games/visual-search';
import '@/games/word-scramble';

// Register board games
import '@/board-games/snakes-ladders';
import '@/board-games/checkers';
import '@/board-games/connect-four';
import '@/board-games/tic-tac-toe';
import '@/board-games/memory-board';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexClientProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ConvexClientProvider>
  </StrictMode>,
);
