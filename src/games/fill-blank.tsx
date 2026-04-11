import { useState, useEffect, useMemo, type ReactElement } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

interface FillBlank {
  word: string;
  clue: string;
  blanks: { start: number; length: number; answer: string }[];
}

interface PuzzleSet {
  theme: string;
  puzzle: FillBlank;
}

const PUZZLE_SETS: PuzzleSet[] = [
  {
    theme: 'Geography',
    puzzle: {
      word: 'AUSTRALIA',
      clue: 'The smallest continent',
      blanks: [
        { start: 0, length: 3, answer: 'AUS' },
        { start: 4, length: 3, answer: 'ALI' },
        { start: 7, length: 3, answer: 'IA' },
      ],
    },
  },
  {
    theme: 'Science',
    puzzle: {
      word: 'ELECTRON',
      clue: 'Negatively charged particle',
      blanks: [
        { start: 0, length: 3, answer: 'ELE' },
        { start: 4, length: 3, answer: 'TRO' },
        { start: 7, length: 2, answer: 'ON' },
      ],
    },
  },
  {
    theme: 'Animals',
    puzzle: {
      word: 'DOLPHIN',
      clue: 'Intelligent sea mammal',
      blanks: [
        { start: 0, length: 3, answer: 'DOL' },
        { start: 3, length: 3, answer: 'PHI' },
        { start: 6, length: 2, answer: 'IN' },
      ],
    },
  },
  {
    theme: 'Space',
    puzzle: {
      word: 'SATELLITE',
      clue: 'Orbits a planet',
      blanks: [
        { start: 0, length: 3, answer: 'SAT' },
        { start: 4, length: 3, answer: 'ELL' },
        { start: 7, length: 3, answer: 'ITE' },
      ],
    },
  },
  {
    theme: 'Food',
    puzzle: {
      word: 'SPAGHETTI',
      clue: 'Italian pasta',
      blanks: [
        { start: 0, length: 3, answer: 'SPA' },
        { start: 4, length: 3, answer: 'HET' },
        { start: 7, length: 3, answer: 'TI' },
      ],
    },
  },
  {
    theme: 'Music',
    puzzle: {
      word: 'GUITAR',
      clue: 'Six-string instrument',
      blanks: [
        { start: 0, length: 3, answer: 'GUI' },
        { start: 4, length: 2, answer: 'TA' },
        { start: 5, length: 2, answer: 'AR' },
      ],
    },
  },
  {
    theme: 'Sports',
    puzzle: {
      word: 'FOOTBALL',
      clue: 'Played with hands and ball',
      blanks: [
        { start: 0, length: 3, answer: 'FOO' },
        { start: 4, length: 3, answer: 'BALL' },
      ],
    },
  },
  {
    theme: 'Weather',
    puzzle: {
      word: 'HURRICANE',
      clue: 'Tropical storm',
      blanks: [
        { start: 0, length: 3, answer: 'HUR' },
        { start: 4, length: 3, answer: 'RICA' },
        { start: 7, length: 2, answer: 'NE' },
      ],
    },
  },
];

function FillBlankGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps) {
  const difficulty = aiDifficulty || 'medium';
  const puzzleIdx = Math.min(stage - 1, PUZZLE_SETS.length - 1);
  const puzzleSet = PUZZLE_SETS[puzzleIdx];
  const puzzle = puzzleSet.puzzle;

  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setInputs({});
    setChecked({});
    setIsComplete(false);
  }, [puzzleIdx]);

  useEffect(() => {
    if (isComplete) return;
    let allCorrect = true;
    for (const blank of puzzle.blanks) {
      const entered = inputs[blank.start] || '';
      if (entered.toUpperCase() !== blank.answer) {
        allCorrect = false;
        break;
      }
    }
    if (allCorrect && Object.keys(inputs).length > 0) {
      setIsComplete(true);
      const stars = stage >= 8 ? 3 : stage >= 5 ? 2 : 1;
      onScore(stage * 100);
      onProgress(1);
      setTimeout(() => {
        onEnd({ score: stage * 100, stars: Math.min(stars, 3), summary: `${puzzleSet.theme} fill-in solved!` });
      }, 600);
    }
  }, [inputs, puzzle, stage, isComplete, onScore, onProgress, onEnd, puzzleSet.theme]);

  const handleInput = (idx: number, val: string) => {
    if (val.length > 1) val = val[0];
    setInputs(prev => ({ ...prev, [idx]: val.toUpperCase() }));
    
    if (val) {
      const currentBlank = puzzle.blanks.find(b => b.start === idx);
      if (currentBlank) {
        const nextStart = puzzle.blanks.find(b => b.start > idx);
        if (nextStart) {
          const input = document.getElementById(`input-${nextStart.start}`);
          input?.focus();
        }
      }
    }
  };

  const handleCheck = () => {
    const wrong: Record<number, boolean> = {};
    let allCorrect = true;
    for (const blank of puzzle.blanks) {
      const entered = inputs[blank.start] || '';
      if (entered.toUpperCase() !== blank.answer) {
        wrong[blank.start] = true;
        allCorrect = false;
      }
    }
    setChecked(wrong);
    onMessage(allCorrect ? 'All correct!' : 'Some answers are wrong');
  };

  const renderWord = () => {
    const boxes: ReactElement[] = [];
    let currentBlankIdx = 0;
    
    for (let i = 0; i < puzzle.word.length; i++) {
      const blank = puzzle.blanks[currentBlankIdx];
      const isBlankStart = blank && blank.start === i;
      const isInBlank = blank && i >= blank.start && i < blank.start + blank.length;
      
      if (isBlankStart) {
        boxes.push(
          <input
            key={i}
            id={`input-${i}`}
            type="text"
            maxLength={1}
            value={inputs[i] || ''}
            onChange={(e) => handleInput(i, e.target.value)}
            className={`w-10 h-12 text-center text-xl font-bold rounded-lg border-2 transition-all ${
              checked[i] 
                ? 'bg-danger/30 border-danger text-danger'
                : inputs[i] 
                  ? 'bg-accent/20 border-accent text-accent'
                  : 'bg-card border-card-hover text-text'
            }`}
            disabled={isComplete}
          />
        );
        currentBlankIdx++;
      } else if (isInBlank) {
        boxes.push(
          <input
            key={i}
            id={`input-${i}`}
            type="text"
            maxLength={1}
            value={inputs[i] || ''}
            onChange={(e) => handleInput(i, e.target.value)}
            className={`w-10 h-12 text-center text-xl font-bold rounded-lg border-2 transition-all ${
              checked[i] 
                ? 'bg-danger/30 border-danger text-danger'
                : inputs[i] 
                  ? 'bg-accent/20 border-accent text-accent'
                  : 'bg-card border-card-hover text-text'
            }`}
            disabled={isComplete}
          />
        );
      } else {
        boxes.push(
          <div key={i} className="w-10 h-12 flex items-center justify-center text-2xl font-bold text-text-muted">
            {puzzle.word[i]}
          </div>
        );
      }
    }
    return boxes;
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">Fill in the Blank</h1>
        <div className="flex gap-2 text-xs">
          <span className="bg-card rounded-lg px-2 py-1 text-accent">{puzzleSet.theme}</span>
          <span className="bg-card rounded-lg px-2 py-1 text-text-muted">Stage {stage}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-card rounded-xl p-6 mb-6">
          <div className="text-center text-sm text-text-muted mb-2">CLUE:</div>
          <div className="text-center text-lg font-medium text-text mb-4">{puzzle.clue}</div>
          <div className="flex gap-2 flex-wrap justify-center">
            {renderWord()}
          </div>
        </div>

        <div className="text-center text-sm text-text-muted mb-4">
          Fill in the missing letters
        </div>

        {!isComplete && (
          <button
            onClick={handleCheck}
            className="bg-accent text-bg font-semibold px-8 py-3 rounded-xl hover:opacity-90 active:scale-95"
          >
            Check Answers
          </button>
        )}

        {isComplete && (
          <div className="text-center p-4 bg-success/20 rounded-xl">
            <span className="text-3xl">🎉</span>
            <p className="text-success font-bold mt-2">Complete!</p>
            <p className="text-sm text-text-muted">{puzzle.word}</p>
          </div>
        )}
      </div>
    </div>
  );
}

registerGame('fill-blank', {
  name: 'Fill in the Blank',
  emoji: '✏️',
  description: 'Fill in missing letters to complete the word!',
  category: 'memory',
  stages: 10,
  component: FillBlankGame,
  aiDifficulty: 'medium',
});

export default FillBlankGame;