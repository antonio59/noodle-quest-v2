import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

type Phase = 'intro' | 'playing' | 'feedback' | 'done';

const TIPS = [
  "💡 Tip: Focus on one distinctive corner or feature and track where it moves!",
  "💡 Tip: Imagine holding the shape and physically rotating it in your hand.",
  "💡 Tip: Count the cells — if the count differs, it can't be a match!",
  "💡 Tip: Higher stages add mirror images — mirrors flip left/right, rotation doesn't!",
  "💡 Tip: Eliminate obviously wrong shapes first, then compare the remaining options.",
];

const SHAPES = [
  { name: 'L', cells: [[0,0],[1,0],[2,0],[2,1]] },
  { name: 'T', cells: [[0,0],[0,1],[0,2],[1,1]] },
  { name: 'Z', cells: [[0,0],[0,1],[1,1],[1,2]] },
  { name: 'S', cells: [[0,1],[0,2],[1,0],[1,1]] },
  { name: 'J', cells: [[0,1],[1,1],[2,0],[2,1]] },
  { name: 'I', cells: [[0,0],[1,0],[2,0],[3,0]] },
  { name: 'Plus', cells: [[0,1],[1,0],[1,1],[1,2],[2,1]] },
  { name: 'U', cells: [[0,0],[0,2],[1,0],[1,1],[1,2]] },
  { name: 'Corner', cells: [[0,0],[0,1],[0,2],[1,0],[2,0]] },
  { name: 'Zigzag', cells: [[0,0],[1,0],[1,1],[2,1],[2,2]] },
];

function rotateShape(cells: number[][], times: number): number[][] {
  let result = cells.map(c => [...c]);
  for (let t = 0; t < times; t++) {
    result = result.map(([r, c]) => [c, -r]);
    const minR = Math.min(...result.map(([r]) => r));
    const minC = Math.min(...result.map(([, c]) => c));
    result = result.map(([r, c]) => [r - minR, c - minC]);
  }
  return result;
}

function mirrorShape(cells: number[][]): number[][] {
  const maxC = Math.max(...cells.map(([, c]) => c));
  const mirrored = cells.map(([r, c]) => [r, maxC - c]);
  const minR = Math.min(...mirrored.map(([r]) => r));
  const minC = Math.min(...mirrored.map(([, c]) => c));
  return mirrored.map(([r, c]) => [r - minR, c - minC]);
}

function shapesMatch(a: number[][], b: number[][]): boolean {
  if (a.length !== b.length) return false;
  const sortA = a.map(c => c.join(',')).sort();
  const sortB = b.map(c => c.join(',')).sort();
  return sortA.every((v, i) => v === sortB[i]);
}

const CONFIG: Record<number, { timeLimit: number; rounds: number; allowMirror: boolean; shapeCount: number; optionCount: number }> = {
  1: { timeLimit: 60, rounds: 6, allowMirror: false, shapeCount: 4, optionCount: 3 },
  2: { timeLimit: 55, rounds: 6, allowMirror: false, shapeCount: 4, optionCount: 3 },
  3: { timeLimit: 50, rounds: 8, allowMirror: false, shapeCount: 5, optionCount: 3 },
  4: { timeLimit: 48, rounds: 8, allowMirror: false, shapeCount: 6, optionCount: 4 },
  5: { timeLimit: 45, rounds: 8, allowMirror: false, shapeCount: 6, optionCount: 4 },
  6: { timeLimit: 43, rounds: 10, allowMirror: false, shapeCount: 7, optionCount: 4 },
  7: { timeLimit: 40, rounds: 10, allowMirror: true, shapeCount: 7, optionCount: 4 },
  8: { timeLimit: 38, rounds: 10, allowMirror: true, shapeCount: 8, optionCount: 4 },
  9: { timeLimit: 35, rounds: 12, allowMirror: true, shapeCount: 8, optionCount: 4 },
  10: { timeLimit: 33, rounds: 12, allowMirror: true, shapeCount: 10, optionCount: 4 },
  11: { timeLimit: 30, rounds: 12, allowMirror: true, shapeCount: 10, optionCount: 4 },
  12: { timeLimit: 28, rounds: 14, allowMirror: true, shapeCount: 10, optionCount: 4 },
  13: { timeLimit: 26, rounds: 14, allowMirror: true, shapeCount: 10, optionCount: 4 },
  14: { timeLimit: 25, rounds: 14, allowMirror: true, shapeCount: 10, optionCount: 4 },
  15: { timeLimit: 23, rounds: 16, allowMirror: true, shapeCount: 10, optionCount: 4 },
  16: { timeLimit: 22, rounds: 16, allowMirror: true, shapeCount: 10, optionCount: 4 },
  17: { timeLimit: 20, rounds: 18, allowMirror: true, shapeCount: 10, optionCount: 4 },
  18: { timeLimit: 18, rounds: 18, allowMirror: true, shapeCount: 10, optionCount: 4 },
  19: { timeLimit: 16, rounds: 20, allowMirror: true, shapeCount: 10, optionCount: 4 },
  20: { timeLimit: 15, rounds: 20, allowMirror: true, shapeCount: 10, optionCount: 4 },
};

const SHAPE_COLORS = ['#ff6e6c', '#4ade80', '#67e8f9', '#c084fc', '#fbbf24'];

function renderMiniGrid(cells: number[][], color: string, size: number) {
  const maxR = Math.max(...cells.map(([r]) => r)) + 1;
  const maxC = Math.max(...cells.map(([, c]) => c)) + 1;
  const cellSet = new Set(cells.map(c => c.join(',')));

  return (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${maxC}, ${size}px)` }}>
      {Array.from({ length: maxR * maxC }).map((_, i) => {
        const r = Math.floor(i / maxC);
        const c = i % maxC;
        const filled = cellSet.has(`${r},${c}`);
        return (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              background: filled ? color : 'transparent',
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}

function ShapeRotateGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [targetShape, setTargetShape] = useState<number[][]>([]);
  const [options, setOptions] = useState<{ cells: number[][]; isCorrect: boolean }[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('');
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const roundRef = useRef(1);

  const generateRound = useCallback(() => {
    const available = SHAPES.slice(0, config.shapeCount);
    const correctIdx = Math.floor(Math.random() * available.length);
    const correct = available[correctIdx];
    const rotation = Math.floor(Math.random() * 3) + 1;
    const rotated = rotateShape(correct.cells, rotation);

    setTargetShape(correct.cells);

    const opts: { cells: number[][]; isCorrect: boolean }[] = [
      { cells: rotated, isCorrect: true },
    ];

    while (opts.length < config.optionCount) {
      const wrongIdx = Math.floor(Math.random() * available.length);
      if (wrongIdx === correctIdx && available.length > 1) continue;

      const wrongShape = available[wrongIdx];
      const wrongRot = Math.floor(Math.random() * 4);
      let wrongCells = rotateShape(wrongShape.cells, wrongRot);

      if (config.allowMirror && Math.random() > 0.5 && wrongIdx === correctIdx) {
        wrongCells = mirrorShape(wrongCells);
        if (!shapesMatch(wrongCells, rotated)) {
          opts.push({ cells: wrongCells, isCorrect: false });
          continue;
        }
      }

      if (wrongIdx !== correctIdx && !shapesMatch(wrongCells, rotated)) {
        opts.push({ cells: wrongCells, isCorrect: false });
      }
    }

    setOptions(opts.sort(() => Math.random() - 0.5));
    setPhase('playing');
    setFeedback('');
  }, [config]);

  const startGame = useCallback(() => {
    gameActiveRef.current = true;
    scoreRef.current = 0;
    correctRef.current = 0;
    roundRef.current = 1;
    setScore(0);
    setCorrectCount(0);
    setRound(1);
    setTimeLeft(config.timeLimit);
    generateRound();
  }, [config, generateRound]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameActiveRef.current = false;
          const accuracy = roundRef.current > 1 ? correctRef.current / (roundRef.current - 1) : 0;
          const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
          onEnd({ score: scoreRef.current, stars, summary: `Time's up! ${correctRef.current}/${roundRef.current - 1} correct. Mentally rotate shapes before choosing!` });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, onEnd]);

  const handleChoice = useCallback((isCorrect: boolean) => {
    if (phase !== 'playing' || !gameActiveRef.current) return;

    if (isCorrect) {
      const points = 25 + Math.floor(timeLeft / 2);
      scoreRef.current += points;
      correctRef.current++;
      setScore(scoreRef.current);
      setCorrectCount(correctRef.current);
      onScore(points);
      setFeedback(`✅ Correct! +${points}`);
      setFeedbackColor('#4ade80');
    } else {
      setFeedback('❌ That shape doesn\'t match when rotated!');
      setFeedbackColor('#ff6e6c');
    }

    setPhase('feedback');
    setTimeout(() => {
      if (!gameActiveRef.current) return;
      roundRef.current++;
      setRound(roundRef.current);
      onProgress(roundRef.current / config.rounds);

      if (roundRef.current > config.rounds) {
        gameActiveRef.current = false;
        const accuracy = correctRef.current / config.rounds;
        const stars = accuracy > 0.8 ? 3 : accuracy > 0.5 ? 2 : 1;
        const summary = accuracy > 0.8
          ? `Spatial genius! ${correctRef.current}/${config.rounds} correct! Your mental rotation is amazing! 🧩`
          : `You matched ${correctRef.current}/${config.rounds} shapes. Try rotating the shape in your head!`;
        onEnd({ score: scoreRef.current, stars, summary });
      } else {
        generateRound();
      }
    }, 1000);
  }, [phase, timeLeft, config, onScore, onProgress, onEnd, generateRound]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🔄</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Shape Rotate</h2>
        <p className="text-text-dim mb-4 max-w-xs">Which rotated shape matches the original?</p>
        <div className="bg-card rounded-xl p-4 mb-5 max-w-xs">
          <div className="text-text-muted text-sm mb-2">Mentally rotate the shape to find the match</div>
          <div className="text-warning">{config.rounds} rounds - ⏱️ {config.timeLimit}s</div>
          {config.allowMirror && <div className="text-danger text-xs mt-1">Watch out for mirror images!</div>}
        </div>
        <button onClick={startGame} className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg active:scale-95">
          Start Game! 🔄
        </button>
      </div>
    );
  }

  const color = SHAPE_COLORS[round % SHAPE_COLORS.length];

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center justify-center p-4">
      <div className="flex gap-4 px-4 py-2 bg-card rounded-xl mb-4 w-full justify-center">
        <span className="text-accent font-bold">Q: {round}/{config.rounds}</span>
        <span className="text-success">✅ {correctCount}</span>
        <span className="text-primary">Score: {score}</span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-danger' : 'text-warning'}`}>⏱️ {timeLeft}</span>
      </div>

      <div className="text-text-dim text-sm mb-3">Find the rotated match:</div>

      <div className="bg-card rounded-2xl p-4 mb-6 border-2 border-accent/30">
        {renderMiniGrid(targetShape, color, 16)}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {options.map((opt, idx) => (
          <button
            key={idx}
            onPointerDown={(e) => { e.stopPropagation(); handleChoice(opt.isCorrect); }}
            className="bg-card hover:bg-card-hover rounded-xl p-4 flex items-center justify-center active:scale-90 transition-all border-2 border-white/10 hover:border-accent/50"
          >
            {renderMiniGrid(opt.cells, '#8b8b8b', 14)}
          </button>
        ))}
      </div>

      <div className="text-lg font-bold min-h-[28px] mt-4 text-center" style={{ color: feedbackColor }}>
        {feedback}
      </div>
    </div>
  );
}

registerGame('shape-rotate', {
  name: 'Shape Rotate',
  emoji: '🧩',
  description: 'Which rotated shape matches the original?',
  category: 'motor',
  stages: 20,
  component: ShapeRotateGame,
});

export default ShapeRotateGame;
