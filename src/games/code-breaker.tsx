import { useState, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'done';

const TIPS = [
  "💡 Tip: Start with all different colours to narrow down which ones are in the code!",
  "💡 Tip: 🎯 means right colour AND right position — that's your best clue!",
  "💡 Tip: 🔶 means right colour but wrong position — try moving it!",
  "💡 Tip: Keep track of what you've tried — process of elimination is key!",
  "💡 Tip: Higher stages = longer codes and fewer guesses. Think before you submit!",
];

const COLORS = ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠', '⚪', '🟤'];
const COLOR_NAMES = ['Red', 'Green', 'Blue', 'Yellow', 'Purple', 'Orange', 'White', 'Brown'];

const CONFIG: Record<number, { codeLen: number; colorCount: number; maxGuesses: number }> = {
  1: { codeLen: 3, colorCount: 4, maxGuesses: 10 },
  2: { codeLen: 3, colorCount: 5, maxGuesses: 10 },
  3: { codeLen: 4, colorCount: 4, maxGuesses: 10 },
  4: { codeLen: 4, colorCount: 5, maxGuesses: 10 },
  5: { codeLen: 4, colorCount: 5, maxGuesses: 9 },
  6: { codeLen: 4, colorCount: 6, maxGuesses: 9 },
  7: { codeLen: 4, colorCount: 6, maxGuesses: 8 },
  8: { codeLen: 4, colorCount: 6, maxGuesses: 7 },
  9: { codeLen: 4, colorCount: 7, maxGuesses: 8 },
  10: { codeLen: 4, colorCount: 7, maxGuesses: 7 },
  11: { codeLen: 5, colorCount: 6, maxGuesses: 10 },
  12: { codeLen: 5, colorCount: 6, maxGuesses: 9 },
  13: { codeLen: 5, colorCount: 7, maxGuesses: 9 },
  14: { codeLen: 5, colorCount: 7, maxGuesses: 8 },
  15: { codeLen: 5, colorCount: 8, maxGuesses: 8 },
  16: { codeLen: 5, colorCount: 8, maxGuesses: 7 },
  17: { codeLen: 6, colorCount: 6, maxGuesses: 10 },
  18: { codeLen: 6, colorCount: 7, maxGuesses: 9 },
  19: { codeLen: 6, colorCount: 8, maxGuesses: 8 },
  20: { codeLen: 6, colorCount: 8, maxGuesses: 7 },
};

interface Guess {
  code: number[];
  exact: number;
  close: number;
}

function checkGuess(guess: number[], secret: number[]): { exact: number; close: number } {
  let exact = 0;
  const gRemain: number[] = [];
  const sRemain: number[] = [];

  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) {
      exact++;
    } else {
      gRemain.push(guess[i]);
      sRemain.push(secret[i]);
    }
  }

  let close = 0;
  const sCounted = [...sRemain];
  for (const g of gRemain) {
    const idx = sCounted.indexOf(g);
    if (idx !== -1) {
      close++;
      sCounted.splice(idx, 1);
    }
  }

  return { exact, close };
}

function CodeBreakerGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const availableColors = COLORS.slice(0, config.colorCount);

  const [phase, setPhase] = useState<Phase>('intro');
  const [secret, setSecret] = useState<number[]>([]);
  const [currentGuess, setCurrentGuess] = useState<number[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [score, setScore] = useState(0);

  const startGame = useCallback(() => {
    const code: number[] = [];
    for (let i = 0; i < config.codeLen; i++) {
      code.push(Math.floor(Math.random() * config.colorCount));
    }
    setSecret(code);
    setCurrentGuess([]);
    setGuesses([]);
    setScore(0);
    setPhase('playing');
  }, [config]);

  const addColor = useCallback((colorIdx: number) => {
    if (phase !== 'playing') return;
    if (currentGuess.length >= config.codeLen) return;
    setCurrentGuess(prev => [...prev, colorIdx]);
  }, [phase, currentGuess, config]);

  const removeLastColor = useCallback(() => {
    setCurrentGuess(prev => prev.slice(0, -1));
  }, []);

  const submitGuess = useCallback(() => {
    if (currentGuess.length !== config.codeLen) return;

    const { exact, close } = checkGuess(currentGuess, secret);
    const newGuess: Guess = { code: [...currentGuess], exact, close };
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);
    setCurrentGuess([]);

    if (exact === config.codeLen) {
      const guessBonus = Math.max(0, (config.maxGuesses - newGuesses.length)) * 30;
      const totalScore = 100 + guessBonus;
      setScore(totalScore);
      onScore(totalScore);
      onProgress(1);

      const stars = newGuesses.length <= Math.ceil(config.maxGuesses * 0.4) ? 3
        : newGuesses.length <= Math.ceil(config.maxGuesses * 0.7) ? 2 : 1;
      const summary = stars === 3
        ? `Cracked it in ${newGuesses.length} guesses! Brilliant deduction! 🧠`
        : `Code cracked in ${newGuesses.length} guesses! Use the clues to narrow down faster.`;

      setTimeout(() => onEnd({ score: totalScore, stars, summary }), 800);
      setPhase('done');
      return;
    }

    if (newGuesses.length >= config.maxGuesses) {
      onProgress(1);
      const summary = `Out of guesses! The code was ${secret.map(i => COLORS[i]).join('')}. Use exact/close hints to eliminate options!`;
      setTimeout(() => onEnd({ score: 0, stars: 1, summary }), 800);
      setPhase('done');
    } else {
      onProgress(newGuesses.length / config.maxGuesses);
    }
  }, [currentGuess, config, secret, guesses, onScore, onProgress, onEnd]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Code Breaker</h2>
        <p className="text-text-dim mb-4 max-w-xs">Crack the secret colour code!</p>
        <div className="bg-card rounded-xl p-4 mb-5 max-w-xs">
          <div className="flex gap-1 justify-center mb-2">{availableColors.map((c, i) => <span key={i} className="text-2xl">{c}</span>)}</div>
          <div className="text-success text-sm">🎯 = right colour, right position</div>
          <div className="text-warning text-sm">🔶 = right colour, wrong position</div>
          <div className="text-text-muted text-sm mt-2">{config.codeLen} slots - {config.maxGuesses} guesses</div>
        </div>
        <button onClick={startGame} className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg active:scale-95">
          Start Game! 🔐
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center p-3">
      <div className="flex gap-4 px-4 py-2 bg-card rounded-xl mb-3 w-full justify-center">
        <span className="text-accent font-bold">Guess {guesses.length + 1}/{config.maxGuesses}</span>
        <span className="text-primary">Score: {score}</span>
      </div>

      {/* Previous guesses */}
      <div className="flex-1 overflow-y-auto w-full max-w-sm space-y-1.5 mb-3">
        {guesses.map((g, gIdx) => (
          <div key={gIdx} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2">
            <span className="text-text-muted text-xs w-5">{gIdx + 1}</span>
            <div className="flex gap-1 flex-1">
              {g.code.map((c, i) => <span key={i} className="text-xl">{COLORS[c]}</span>)}
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: g.exact }).map((_, i) => <span key={`e${i}`} className="text-sm">🎯</span>)}
              {Array.from({ length: g.close }).map((_, i) => <span key={`c${i}`} className="text-sm">🔶</span>)}
              {Array.from({ length: config.codeLen - g.exact - g.close }).map((_, i) => <span key={`x${i}`} className="text-sm">❌</span>)}
            </div>
          </div>
        ))}
      </div>

      {/* Current guess */}
      {phase === 'playing' && (
        <>
          <div className="flex gap-2 mb-3 items-center">
            {Array.from({ length: config.codeLen }).map((_, i) => (
              <div key={i} className="w-12 h-12 rounded-xl bg-card border-2 border-white/20 flex items-center justify-center text-2xl">
                {currentGuess[i] !== undefined ? COLORS[currentGuess[i]] : '?'}
              </div>
            ))}
            <button onClick={removeLastColor} className="text-text-muted text-sm px-2 py-1 bg-card rounded-lg active:scale-95 ml-1">
              ← Undo
            </button>
          </div>

          {/* Color picker */}
          <div className="flex gap-2 flex-wrap justify-center mb-3">
            {availableColors.map((c, i) => (
              <button
                key={i}
                onPointerDown={(e) => { e.stopPropagation(); addColor(i); }}
                className="w-11 h-11 rounded-xl bg-card hover:bg-card-hover text-2xl flex items-center justify-center active:scale-90 transition-transform"
              >
                {c}
              </button>
            ))}
          </div>

          <button
            onClick={submitGuess}
            disabled={currentGuess.length !== config.codeLen}
            className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl active:scale-95 disabled:opacity-40"
          >
            Submit Guess ✓
          </button>
        </>
      )}

      {phase === 'done' && (
        <div className="text-center mb-4">
          <div className="text-sm text-text-muted">The code was:</div>
          <div className="flex gap-1 justify-center mt-1">{secret.map((c, i) => <span key={i} className="text-3xl">{COLORS[c]}</span>)}</div>
        </div>
      )}
    </div>
  );
}

registerGame('code-breaker', {
  name: 'Code Breaker',
  emoji: '🔐',
  description: 'Crack the secret colour code using logic and clues!',
  category: 'sequence',
  stages: 20,
  component: CodeBreakerGame,
});

export default CodeBreakerGame;
