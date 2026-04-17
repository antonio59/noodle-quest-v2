import { useState, useEffect, useMemo } from 'react';
import type { GameProps } from '@/types';

interface FillBlank {
  word: string;
  clue: string;
  blanks: number[]; // indices of blank positions
}

interface PuzzleSet {
  theme: string;
  puzzle: FillBlank;
}

const PUZZLE_SETS: PuzzleSet[] = [
  { theme: 'Geography', puzzle: { word: 'AUSTRALIA', clue: 'The smallest continent', blanks: [0, 4, 7] } },
  { theme: 'Science', puzzle: { word: 'ELECTRON', clue: 'Negatively charged particle', blanks: [0, 3, 6] } },
  { theme: 'Animals', puzzle: { word: 'DOLPHIN', clue: 'Intelligent sea mammal', blanks: [0, 3, 6] } },
  { theme: 'Space', puzzle: { word: 'SATELLITE', clue: 'Orbits a planet', blanks: [0, 4, 7] } },
  { theme: 'Food', puzzle: { word: 'SPAGHETTI', clue: 'Italian pasta', blanks: [0, 4, 7] } },
  { theme: 'Music', puzzle: { word: 'GUITAR', clue: 'Six-string instrument', blanks: [0, 3] } },
  { theme: 'Sports', puzzle: { word: 'FOOTBALL', clue: 'Played with hands and ball', blanks: [0, 4] } },
  { theme: 'Weather', puzzle: { word: 'HURRICANE', clue: 'Tropical storm', blanks: [0, 4, 7] } },
  { theme: 'History', puzzle: { word: 'PHARAOH', clue: 'Egyptian ruler', blanks: [0, 3, 5] } },
  { theme: 'Nature', puzzle: { word: 'VOLCANO', clue: 'Mountain that erupts', blanks: [0, 3, 5] } },
  { theme: 'Body', puzzle: { word: 'SKELETON', clue: 'Framework of bones', blanks: [0, 4, 7] } },
  { theme: 'Ocean', puzzle: { word: 'JELLYFISH', clue: 'Stinging sea creature', blanks: [0, 5, 8] } },
];

function FillBlankGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const puzzleIdx = Math.min(stage - 1, PUZZLE_SETS.length - 1);
  const puzzleSet = PUZZLE_SETS[puzzleIdx];
  const { word, clue, blanks } = puzzleSet.puzzle;

  // Set of blank indices — derived from props, safe to read during render
  const blankSet = useMemo(() => new Set(blanks), [blanks]);

  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [isComplete, setIsComplete] = useState(false);

  // Reset on stage change
  useEffect(() => {
    setInputs({});
    setWrong(new Set());
    setIsComplete(false);
  }, [puzzleIdx]);

  const handleInput = (idx: number, val: string) => {
    if (isComplete) return;
    const letter = (val.slice(-1) || '').toUpperCase();
    const updated = { ...inputs, [idx]: letter };
    setInputs(updated);
    // Clear error on this cell
    setWrong(prev => { const n = new Set(prev); n.delete(idx); return n; });

    // Report progress based on filled blanks
    const filled = blanks.filter(b => !!updated[b]).length;
    onProgress(filled / blanks.length);

    // Auto-advance to next blank
    if (letter) {
      const remaining = blanks.filter(b => b > idx && !updated[b]);
      if (remaining.length > 0) {
        document.getElementById(`fb-${remaining[0]}`)?.focus();
      }
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !inputs[idx]) {
      // Move to previous blank
      const prev = [...blanks].reverse().find(b => b < idx);
      if (prev !== undefined) {
        setInputs(p => { const n = { ...p }; delete n[prev]; return n; });
        document.getElementById(`fb-${prev}`)?.focus();
      }
    }
  };

  const handleCheck = () => {
    const wrongSet = new Set<number>();
    let allCorrect = true;

    for (const idx of blanks) {
      const entered = (inputs[idx] || '').toUpperCase();
      const expected = word[idx];
      if (entered !== expected) {
        wrongSet.add(idx);
        allCorrect = false;
      }
    }

    setWrong(wrongSet);

    if (allCorrect) {
      setIsComplete(true);
      const stars = stage >= 8 ? 3 : stage >= 5 ? 2 : 1;
      const pts = stage * 100;
      onScore(pts);
      onProgress(1);
      onMessage('All correct!');
      setTimeout(() => {
        onEnd({ score: pts, stars: Math.min(stars, 3), summary: `${puzzleSet.theme} fill-in solved!` });
      }, 600);
    } else {
      onMessage(`${wrongSet.size} letter${wrongSet.size > 1 ? 's' : ''} wrong — try again!`);
    }
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
          <div className="text-center text-lg font-medium text-text mb-4">{clue}</div>
          <div className="flex gap-1.5 flex-wrap justify-center">
            {word.split('').map((ch, i) => {
              const isBlank = blankSet.has(i);
              if (isBlank) {
                const hasError = wrong.has(i);
                const hasValue = !!inputs[i];
                return (
                  <input
                    key={i}
                    id={`fb-${i}`}
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    maxLength={2}
                    value={inputs[i] || ''}
                    onChange={e => handleInput(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className={`w-10 h-12 text-center text-xl font-bold rounded-lg border-2 transition-all outline-none ${
                      isComplete
                        ? 'bg-success/20 border-success text-success'
                        : hasError
                          ? 'bg-danger/30 border-danger text-danger animate-[shake_0.3s_ease]'
                          : hasValue
                            ? 'bg-accent/20 border-accent text-accent'
                            : 'bg-card border-card-hover text-text focus:border-accent'
                    }`}
                    disabled={isComplete}
                  />
                );
              }
              return (
                <div key={i} className="w-10 h-12 flex items-center justify-center text-2xl font-bold text-text-muted">
                  {ch}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center text-sm text-text-muted mb-4">
          Tap each blank and type the missing letter
        </div>

        {!isComplete && (
          <button
            onClick={handleCheck}
            disabled={blanks.some(b => !inputs[b])}
            className="bg-accent text-bg font-semibold px-8 py-3 rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-30 transition-all"
          >
            Check Answers
          </button>
        )}

        {isComplete && (
          <div className="text-center p-4 bg-success/20 rounded-xl">
            <span className="text-3xl">🎉</span>
            <p className="text-success font-bold mt-2">Complete!</p>
            <p className="text-sm text-text-muted">{word}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FillBlankGame;
