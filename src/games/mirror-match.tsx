import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { GameProps } from '@/types';
import { scaleFromLast } from '@/lib/endless-stage';

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

type Phase = 'memorize' | 'find' | 'done';
type CellState = 'idle' | 'correct' | 'wrong';

function MirrorMatchGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = useMemo(() => scaleFromLast(stage, CONFIG, {
    gridSize: 0.08, diffs: 0.12, showTime: -0.1, rounds: 0.1,
  }, {
    gridSize: 7, diffs: 8, showTime: 1200, rounds: 10,
  }), [stage]);

  const [phase, setPhase] = useState<Phase>('memorize');
  const [roundNum, setRoundNum] = useState(0);
  const [score, setScore] = useState(0);
  const [gridA, setGridA] = useState<string[]>([]);
  const [gridB, setGridB] = useState<string[]>([]);
  const [differences, setDifferences] = useState<Set<number>>(new Set());
  const [foundSet, setFoundSet] = useState<Set<number>>(new Set());
  const [cellStates, setCellStates] = useState<Record<number, CellState>>({});
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('var(--color-accent)');
  const [memorizeProgress, setMemorizeProgress] = useState(100);

  const currentScoreRef = useRef(0);
  const roundRef = useRef(0);
  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const memorizeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (memorizeIntervalRef.current) clearInterval(memorizeIntervalRef.current);
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
    setMemorizeProgress(100);
    setPhase('memorize');

    if (memorizeIntervalRef.current) clearInterval(memorizeIntervalRef.current);
    const startTime = Date.now();
    memorizeIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.max(0, 100 - (elapsed / config.showTime) * 100);
      setMemorizeProgress(pct);
      if (pct <= 0 && memorizeIntervalRef.current) {
        clearInterval(memorizeIntervalRef.current);
        memorizeIntervalRef.current = null;
      }
    }, 50);

    schedule(() => {
      if (memorizeIntervalRef.current) {
        clearInterval(memorizeIntervalRef.current);
        memorizeIntervalRef.current = null;
      }
      setMemorizeProgress(0);
      setPhase('find');
      setFeedback(`Find ${diffSet.size} difference${diffSet.size > 1 ? 's' : ''} in Grid B!`);
      setFeedbackColor('#fbbf24');
    }, config.showTime);
  }, [generateRound, config.showTime, schedule]);

  const startGame = useCallback(() => {
    currentScoreRef.current = 0;
    roundRef.current = 0;
    setScore(0);
    startRound();
  }, [startRound]);

  useEffect(() => {
    startGame();
  }, [startGame]);

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

  const gs = config.gridSize;
  const cellSize = gs >= 5 ? 38 : gs >= 4 ? 44 : 52;
  const fontSize = cellSize >= 44 ? '1.4rem' : '1.1rem';
  const isMemorize = phase === 'memorize';

  return (
    <div className="h-full flex flex-col items-center p-4">
      <div className="flex gap-4 mb-2 bg-card rounded-xl px-4 py-2">
        <span className="text-warning font-bold">Round: {roundNum}/{config.rounds}</span>
        <span className="text-accent">Score: {score}</span>
        <span className="text-success">Found: {foundSet.size}/{differences.size}</span>
      </div>

      {isMemorize ? (
        <div className="w-full max-w-xs mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-cyan-400 font-bold">👀 Memorize both grids!</span>
            <span className="text-text-muted">{Math.ceil((memorizeProgress / 100) * config.showTime / 1000)}s</span>
          </div>
          <div className="w-full h-2.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-none"
              style={{
                width: `${memorizeProgress}%`,
                background: memorizeProgress > 50
                  ? 'linear-gradient(90deg, #67e8f9, #a78bfa)'
                  : memorizeProgress > 20
                    ? 'linear-gradient(90deg, #fbbf24, #fb923c)'
                    : 'linear-gradient(90deg, #ef4444, #ff6e6c)',
              }}
            />
          </div>
        </div>
      ) : (
        <div className="text-sm py-2 min-h-[30px]" style={{ color: feedbackColor }}>
          {phase === 'find' && `🫣 Grid A vanished! ${feedback}`}
        </div>
      )}

      <div className="flex gap-4 items-start p-2">
        <div className="text-center">
          <div className="text-xs text-text-dim mb-1.5 font-bold">Grid A</div>
          <div
            className="grid gap-0.5 bg-card p-2.5 rounded-xl transition-all duration-500"
            style={{
              gridTemplateColumns: `repeat(${gs}, ${cellSize}px)`,
              opacity: isMemorize ? 1 : 0.08,
              filter: isMemorize ? 'none' : 'blur(6px)',
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
          <div className="text-xs text-text-dim mb-1.5 font-bold">Grid B</div>
          <div
            className="grid gap-0.5 bg-card p-2.5 rounded-xl"
            style={{ gridTemplateColumns: `repeat(${gs}, ${cellSize}px)` }}
          >
            {gridB.map((emoji, i) => {
              const state = cellStates[i];
              let bg = '#1a1833';
              let border = 'none';
              let transform = 'scale(1)';
              const cursor = phase === 'find' ? 'pointer' : 'default';

              if (state === 'correct') {
                bg = 'rgba(74, 222, 128, 0.3)';
                border = '2px solid #4ade80';
                transform = 'scale(1.1)';
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

      {!isMemorize && feedback && phase !== 'find' && (
        <div className="text-sm mt-2 text-center" style={{ color: feedbackColor }}>
          {feedback}
        </div>
      )}
      {phase === 'find' && feedback && (
        <div className="text-sm mt-2 text-center" style={{ color: feedbackColor }}>
          {feedback}
        </div>
      )}
    </div>
  );
}

export default MirrorMatchGame;
