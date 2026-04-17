import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';

const EMOJIS = ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠', '⭐', '💎', '🌸', '🍀', '🌙', '⚡', '🔥', '❄️', '🎵', '🦋', '🐢', '🐝', '🌺', '🎯', '🎪', '🚀', '🌈', '🍕', '🎸'];

const CONFIG: Record<number, { gridSize: number; diffs: number; showTime: number; rounds: number }> = {
  1: { gridSize: 3, diffs: 1, showTime: 3000, rounds: 4 },
  2: { gridSize: 3, diffs: 1, showTime: 2800, rounds: 4 },
  3: { gridSize: 3, diffs: 2, showTime: 3000, rounds: 4 },
  4: { gridSize: 4, diffs: 2, showTime: 3200, rounds: 5 },
  5: { gridSize: 4, diffs: 2, showTime: 2800, rounds: 5 },
  6: { gridSize: 4, diffs: 3, showTime: 3000, rounds: 5 },
  7: { gridSize: 5, diffs: 3, showTime: 3200, rounds: 5 },
  8: { gridSize: 5, diffs: 3, showTime: 2800, rounds: 6 },
  9: { gridSize: 5, diffs: 4, showTime: 3000, rounds: 6 },
  10: { gridSize: 5, diffs: 4, showTime: 2500, rounds: 6 },
};

const TIPS = [
  '💡 Tip: Scan row by row, left to right. Don\'t try to look at everything at once!',
  '💡 Tip: Focus on the corners first — differences are easier to spot there.',
  '💡 Tip: Look for shapes that are MISSING, not just different.',
  '💡 Tip: Blink and look away, then look back — differences jump out!',
  '💡 Tip: Count how many of each emoji you see. Different counts = difference!',
];

type Phase = 'intro' | 'memorize' | 'find' | 'done';
type CellState = 'idle' | 'correct' | 'wrong';

function MirrorMatchGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const tip = useRef(TIPS[Math.floor(Math.random() * TIPS.length)]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [roundNum, setRoundNum] = useState(0);
  const [score, setScore] = useState(0);
  const [gridA, setGridA] = useState<string[]>([]);
  const [gridB, setGridB] = useState<string[]>([]);
  const [differences, setDifferences] = useState<Set<number>>(new Set());
  const [foundSet, setFoundSet] = useState<Set<number>>(new Set());
  const [cellStates, setCellStates] = useState<Record<number, CellState>>({});
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#a78bfa');
  const [statusText, setStatusText] = useState('👀 Memorize both grids!');
  const [statusColor, setStatusColor] = useState('#67e8f9');

  const currentScoreRef = useRef(0);
  const roundRef = useRef(0);

  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter(x => x !== id);
      if (!endedRef.current) fn();
    }, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      endedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const generateRound = useCallback(() => {
    const gs = config.gridSize;
    const totalCells = gs * gs;

    const gA: string[] = [];
    for (let i = 0; i < totalCells; i++) {
      gA.push(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
    }

    const gB = [...gA];
    const diffSet = new Set<number>();
    while (diffSet.size < config.diffs) {
      const pos = Math.floor(Math.random() * totalCells);
      if (!diffSet.has(pos)) {
        diffSet.add(pos);
        let newEmoji: string;
        do {
          newEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        } while (newEmoji === gA[pos]);
        gB[pos] = newEmoji;
      }
    }

    return { gA, gB, diffSet };
  }, [config]);

  const startRound = useCallback(() => {
    roundRef.current += 1;
    setRoundNum(roundRef.current);
    const { gA, gB, diffSet } = generateRound();
    setGridA(gA);
    setGridB(gB);
    setDifferences(diffSet);
    setFoundSet(new Set());
    setCellStates({});
    setFeedback('');
    setFeedbackColor('#a78bfa');
    setStatusText('👀 Memorize both grids!');
    setStatusColor('#67e8f9');
    setPhase('memorize');

    schedule(() => {
      setPhase('find');
      setStatusText('🫣 Grid A vanished! Find the differences in Grid B!');
      setStatusColor('#fbbf24');
    }, config.showTime);
  }, [generateRound, config.showTime, schedule]);

  const startGame = useCallback(() => {
    currentScoreRef.current = 0;
    roundRef.current = 0;
    setScore(0);
    startRound();
  }, [startRound]);

  const finishRound = useCallback(() => {
    setPhase('done');

    schedule(() => {
      if (roundRef.current >= config.rounds) {
        const finalScore = currentScoreRef.current;
        const maxScore = config.rounds * config.diffs * 25;
        const ratio = maxScore > 0 ? finalScore / maxScore : 0;
        const stars = ratio >= 0.75 ? 3 : ratio >= 0.4 ? 2 : 1;
        let summary = `Final score: ${finalScore}. `;
        if (stars === 3) summary += 'Eagle eyes! You spot every detail! 🦅';
        else if (stars === 2) summary += 'Good observation! Scan row by row for even better results.';
        else summary += 'Observation takes practice! Try counting each emoji type.';
        if (endedRef.current) return;
        endedRef.current = true;
        onEnd({ score: finalScore, stars, summary });
      } else {
        startRound();
      }
    }, 1000);
  }, [config.rounds, config.diffs, onEnd, startRound, schedule]);

  const handleCellClick = useCallback((idx: number) => {
    if (phase !== 'find') return;

    if (differences.has(idx)) {
      const newFound = new Set(foundSet);
      newFound.add(idx);
      setFoundSet(newFound);
      setCellStates(prev => ({ ...prev, [idx]: 'correct' }));

      const newScore = currentScoreRef.current + 25;
      currentScoreRef.current = newScore;
      setScore(newScore);
      onScore(25);

      const remaining = differences.size - newFound.size;
      if (remaining === 0) {
        setFeedback('🎉 All differences found!');
        setFeedbackColor('#4ade80');
        onProgress(roundRef.current / config.rounds);
        finishRound();
      } else {
        setFeedback(`✓ Found! ${remaining} more to find`);
        setFeedbackColor('#4ade80');
      }
    } else {
      setCellStates(prev => ({ ...prev, [idx]: 'wrong' }));
      const newScore = Math.max(0, currentScoreRef.current - 10);
      currentScoreRef.current = newScore;
      setScore(newScore);
      onScore(-10);
      setFeedback('✗ Not a difference! -10 pts');
      setFeedbackColor('#ef4444');

      schedule(() => {
        setCellStates(prev => {
          const next = { ...prev };
          delete next[idx];
          return next;
        });
      }, 500);
    }
  }, [phase, differences, foundSet, config.rounds, onScore, onProgress, finishRound, schedule]);

  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🪞</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Mirror Match</h2>
        <p className="text-text-dim mb-6 max-w-xs">
          Two grids flash briefly — find the <strong>differences!</strong>
        </p>

        <div className="bg-card rounded-xl p-4 mb-6 max-w-xs">
          <div className="flex gap-3 justify-center mb-3">
            <div className="text-center">
              <div className="text-xs text-text-dim mb-1">Grid A</div>
              <div className="grid grid-cols-3 gap-0.5">
                {['🔴','🟢','🔵','🟡','🟣','🔴','🟢','⭐','🔵'].map((e, i) => (
                  <span key={i} className="text-base">{e}</span>
                ))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-text-dim mb-1">Grid B</div>
              <div className="grid grid-cols-3 gap-0.5">
                {['🔴','🟢','🔵','🟡','🟣','🔴','🟢','💎','🔵'].map((e, i) => (
                  <span key={i} className="text-base">{e}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="text-warning text-sm">⭐ vs 💎 — Spot the difference!</div>
        </div>

        <div className="bg-surface rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-success text-sm">👀 Both grids show → 🫣 They vanish → 🖐️ Tap the difference!</div>
        </div>

        <p className="text-info text-sm mb-6 max-w-xs">{tip.current}</p>

        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start Game! 🪞
        </button>
      </div>
    );
  }

  const gs = config.gridSize;
  const cellSize = gs >= 5 ? 38 : gs >= 4 ? 44 : 52;
  const fontSize = cellSize >= 44 ? '1.4rem' : '1.1rem';

  return (
    <div className="h-full flex flex-col items-center p-4">
      <div className="flex gap-4 mb-2 bg-card rounded-xl px-4 py-2">
        <span className="text-warning font-bold">Round: {roundNum}/{config.rounds}</span>
        <span className="text-accent">Score: {score}</span>
        <span className="text-success">Found: {foundSet.size}/{config.diffs}</span>
      </div>

      <div className="text-sm py-2 min-h-[30px]" style={{ color: statusColor }}>
        {statusText}
      </div>

      <div className="flex gap-4 items-start p-2">
        <div className="text-center">
          <div className="text-xs text-text-dim mb-1.5">Grid A</div>
          <div
            className="grid gap-0.5 bg-card p-2.5 rounded-xl transition-all duration-300"
            style={{
              gridTemplateColumns: `repeat(${gs}, ${cellSize}px)`,
              opacity: phase === 'memorize' ? 1 : 0.15,
              filter: phase === 'memorize' ? 'none' : 'blur(4px)',
            }}
          >
            {gridA.map((emoji, i) => (
              <div
                key={i}
                className="flex items-center justify-center bg-surface rounded"
                style={{ width: cellSize, height: cellSize, fontSize }}
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>

        <div className="text-2xl text-accent self-center">↔</div>

        <div className="text-center">
          <div className="text-xs text-text-dim mb-1.5">Grid B</div>
          <div
            className="grid gap-0.5 bg-card p-2.5 rounded-xl"
            style={{ gridTemplateColumns: `repeat(${gs}, ${cellSize}px)` }}
          >
            {gridB.map((emoji, i) => {
              const state = cellStates[i];
              let bg = '#1a1833';
              let border = 'none';
              let transform = 'scale(1)';
              let cursor = phase === 'find' ? 'pointer' : 'default';

              if (state === 'correct') {
                bg = 'rgba(74, 222, 128, 0.3)';
                border = '2px solid #4ade80';
                transform = 'scale(1.1)';
                cursor = 'default';
              } else if (state === 'wrong') {
                bg = 'rgba(239, 68, 68, 0.3)';
                border = '2px solid #ef4444';
              }

              return (
                <button
                  key={i}
                  onPointerDown={() => handleCellClick(i)}
                  disabled={phase !== 'find' || state === 'correct'}
                  className="flex items-center justify-center rounded transition-all duration-150 disabled:cursor-default"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    fontSize,
                    background: bg,
                    border,
                    transform,
                    cursor,
                  }}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="text-sm mt-2 text-center" style={{ color: feedbackColor }}>
          {feedback}
        </div>
      )}
    </div>
  );
}

export default MirrorMatchGame;
