import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

const COLORS = ['#232146', '#ff6e6c', '#c084fc', '#67e8f9', '#4ade80', '#fbbf24'];

const CONFIG: Record<number, { size: number; time: number }> = {
  1: { size: 5, time: 0 },
  2: { size: 6, time: 0 },
  3: { size: 7, time: 0 },
  4: { size: 8, time: 0 },
  5: { size: 8, time: 90 },
  6: { size: 10, time: 85 },
  7: { size: 10, time: 80 },
  8: { size: 12, time: 75 },
  9: { size: 12, time: 70 },
  10: { size: 14, time: 65 },
  11: { size: 14, time: 60 },
  12: { size: 14, time: 55 },
  13: { size: 16, time: 55 },
  14: { size: 16, time: 50 },
  15: { size: 16, time: 45 },
  16: { size: 18, time: 45 },
  17: { size: 18, time: 40 },
  18: { size: 18, time: 35 },
  19: { size: 20, time: 35 },
  20: { size: 20, time: 30 },
};

const TIPS = [
  '💡 Tip: Start with one color — fill all of that color first, then move on!',
  '💡 Tip: Look at the SHAPE formed by each color in the target.',
  '💡 Tip: Work from the outside in, or inside out — pick a strategy!',
  '💡 Tip: The dark color (background) is already filled in — focus on the bright colors.',
  '💡 Tip: Take your time! Accuracy matters more than speed.',
];

function generatePattern(size: number): number[][] {
  const pattern = Array.from({ length: size }, () => Array(size).fill(0));
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const normalizedDist = dist / maxDist;
      if (normalizedDist < 0.2) pattern[y][x] = 4;
      else if (normalizedDist < 0.4) pattern[y][x] = 3;
      else if (normalizedDist < 0.6) pattern[y][x] = 2;
      else if (normalizedDist < 0.8) pattern[y][x] = 1;
      else pattern[y][x] = 0;
    }
  }
  return pattern;
}

type Phase = 'intro' | 'playing' | 'result';

function PixelPaintGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [selectedColor, setSelectedColor] = useState(1);
  const [playerGrid, setPlayerGrid] = useState<number[][]>([]);
  const [target, setTarget] = useState<number[][]>([]);
  const [timeLeft, setTimeLeft] = useState(config.time);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#67e8f9');
  const [animatingPixel, setAnimatingPixel] = useState<string | null>(null);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameActiveRef = useRef(false);

  const startGame = useCallback(() => {
    const t = generatePattern(config.size);
    setTarget(t);
    setPlayerGrid(Array.from({ length: config.size }, () => Array(config.size).fill(0)));
    setSelectedColor(1);
    setTimeLeft(config.time);
    setFeedback('');
    setPhase('playing');
    gameActiveRef.current = true;
  }, [config.size, config.time]);

  useEffect(() => {
    if (phase !== 'playing' || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const cellSize = 60 / config.size;
    ctx.clearRect(0, 0, 60, 60);
    target.forEach((row, y) => {
      row.forEach((color, x) => {
        ctx.fillStyle = COLORS[color];
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      });
    });
  }, [phase, target, config.size]);

  const checkArt = useCallback(() => {
    gameActiveRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);

    setPlayerGrid(current => {
      let correct = 0;
      const total = config.size * config.size;
      for (let y = 0; y < config.size; y++) {
        for (let x = 0; x < config.size; x++) {
          if (current[y]?.[x] === target[y]?.[x]) correct++;
        }
      }

      const accuracy = correct / total;
      const finalScore = Math.round(accuracy * 300);
      onScore(finalScore);
      onProgress(1);

      let stars: number, summary: string;
      if (accuracy > 0.95) {
        stars = 3;
        summary = "Pixel perfect! You're an amazing artist! Every square matched! 🌟";
      } else if (accuracy > 0.8) {
        stars = 2;
        summary = `Great job! ${Math.round(accuracy * 100)}% match! Try one color at a time for perfection.`;
      } else if (accuracy > 0.6) {
        stars = 1;
        summary = `Good start! ${Math.round(accuracy * 100)}% match. Focus on matching one color completely before moving on.`;
      } else {
        stars = 1;
        summary = `${Math.round(accuracy * 100)}% match. Tip: Compare the target closely and work on one color at a time!`;
      }

      setFeedback(`${Math.round(accuracy * 100)}% match!`);
      setFeedbackColor(accuracy > 0.8 ? '#4ade80' : '#fbbf24');
      onMessage(`${Math.round(accuracy * 100)}% match`);

      setTimeout(() => {
        onEnd({ score: finalScore, stars, summary });
      }, 1000);

      return current;
    });
  }, [config.size, target, onScore, onProgress, onMessage, onEnd]);

  useEffect(() => {
    if (phase !== 'playing' || config.time <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          checkArt();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, checkArt]);

  const handlePixelClick = useCallback((y: number, x: number) => {
    if (!gameActiveRef.current) return;
    setPlayerGrid(prev => {
      const next = prev.map(r => [...r]);
      next[y][x] = selectedColor;
      return next;
    });
    setAnimatingPixel(`${y}-${x}`);
    setTimeout(() => setAnimatingPixel(null), 100);
  }, [selectedColor]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-6 text-center">
        <div className="text-6xl mb-4">🟦</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Pixel Paint</h2>
        <p className="text-text-dim mb-4 max-w-xs">Copy the pixel art by tapping squares!</p>

        <div className="bg-card rounded-xl p-4 mb-5 max-w-sm">
          <div className="flex gap-1.5 justify-center flex-wrap mb-3">
            {COLORS.slice(1).map((c, i) => (
              <div key={i} className="w-7 h-7 rounded-md" style={{ background: c }} />
            ))}
          </div>
          <div className="text-primary text-sm">Match the {config.size}x{config.size} grid!</div>
          {config.time > 0 ? (
            <div className="text-warning text-sm mt-1">⏱️ Time limit: {config.time} seconds</div>
          ) : (
            <div className="text-success text-sm mt-1">✓ No time limit</div>
          )}
        </div>

        <div className="bg-surface rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-accent text-sm">How to play:</div>
          <div className="text-text-dim text-xs mt-1">
            1. Select a color below<br />2. Tap squares to paint<br />3. Match the target image!
          </div>
        </div>

        <p className="text-primary text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={startGame}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start Painting! 🎨
        </button>
      </div>
    );
  }

  const gridSize = 280;
  const pixelSize = (gridSize - 12 - (config.size - 1) * 2) / config.size;

  return (
    <div className="flex flex-col h-full min-h-[350px] items-center">
      <div className="flex gap-3 p-2 bg-card rounded-xl mb-2 items-center">
        <div className="flex flex-col items-center">
          <span className="text-primary text-xs">TARGET</span>
          <canvas
            ref={canvasRef}
            width={60}
            height={60}
            className="w-[60px] h-[60px] bg-card rounded-md border-2 border-accent"
          />
        </div>
        {config.time > 0 && (
          <span className={`font-bold ${timeLeft <= 10 ? 'text-danger' : 'text-warning'}`}>
            ⏱️ {timeLeft}
          </span>
        )}
      </div>

      <div
        className="grid gap-0.5 bg-bg p-1.5 rounded-lg mb-2"
        style={{
          gridTemplateColumns: `repeat(${config.size}, 1fr)`,
          width: gridSize,
          height: gridSize,
        }}
      >
        {playerGrid.map((row, y) =>
          row.map((color, x) => (
            <div
              key={`${y}-${x}`}
              onPointerDown={() => handlePixelClick(y, x)}
              className="rounded-sm cursor-pointer transition-transform duration-100"
              style={{
                width: pixelSize,
                height: pixelSize,
                background: COLORS[color],
                transform: animatingPixel === `${y}-${x}` ? 'scale(0.9)' : 'scale(1)',
              }}
            />
          ))
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap justify-center mb-2">
        {COLORS.map((c, i) => (
          <button
            key={i}
            onClick={() => setSelectedColor(i)}
            className="w-9 h-9 rounded-lg cursor-pointer transition-all"
            style={{
              background: c,
              border: `3px solid ${i === selectedColor ? '#fff' : 'transparent'}`,
            }}
          />
        ))}
      </div>

      <button
        onClick={checkArt}
        className="bg-success text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95"
      >
        Check My Art! ✓
      </button>

      {feedback && (
        <div className="text-center py-1.5 text-sm" style={{ color: feedbackColor }}>
          {feedback}
        </div>
      )}
    </div>
  );
}

registerGame('pixel-paint', {
  name: 'Pixel Paint',
  emoji: '🟦',
  description: 'Tap the squares to match the pixel art picture!',
  category: 'motor',
  stages: 20,
  component: PixelPaintGame,
});

export default PixelPaintGame;
