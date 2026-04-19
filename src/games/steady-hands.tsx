import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { GameProps } from '@/types';
import { scaleFromLast } from '@/lib/endless-stage';

interface Point { x: number; y: number }
interface Checkpoint { x: number; y: number; collected: boolean }
interface Obstacle { x: number; y: number; radius: number; dx: number; dy: number }

type Phase = 'playing' | 'done';
type EndReason = 'wall' | 'obstacle' | 'finish' | null;

const CONFIG: Record<number, { pathWidth: number; obstacles: boolean; checkpointCount: number }> = {
  1: { pathWidth: 70, obstacles: false, checkpointCount: 3 },
  2: { pathWidth: 60, obstacles: false, checkpointCount: 3 },
  3: { pathWidth: 55, obstacles: false, checkpointCount: 4 },
  4: { pathWidth: 50, obstacles: false, checkpointCount: 4 },
  5: { pathWidth: 45, obstacles: true, checkpointCount: 4 },
  6: { pathWidth: 42, obstacles: true, checkpointCount: 5 },
  7: { pathWidth: 38, obstacles: true, checkpointCount: 5 },
  8: { pathWidth: 35, obstacles: true, checkpointCount: 5 },
  9: { pathWidth: 32, obstacles: true, checkpointCount: 6 },
  10: { pathWidth: 28, obstacles: true, checkpointCount: 6 },
};

const STAR_FEEDBACKS = ["Star collected! ⭐", "Nice! Keep going! 🌟", "Great control! ✨"];

function SteadyHandsGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = useMemo(() => scaleFromLast(stage, CONFIG, {
    pathWidth: -0.1, checkpointCount: 0.1,
  }, {
    pathWidth: 12, checkpointCount: 10,
  }), [stage]);
  const [phase, setPhase] = useState<Phase>('playing');
  const [score, setScore] = useState(0);
  const [collected, setCollected] = useState(0);
  const [feedback, setFeedback] = useState('Drag to move the ball!');
  const [ballPos, setBallPos] = useState<Point>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const collectedRef = useRef(0);
  const pathRef = useRef<Point[]>([]);
  const checkpointsRef = useRef<Checkpoint[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const ballRef = useRef<Point>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const moveTimeRef = useRef(0);

  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    return () => {
      endedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
      intervalsRef.current.forEach(clearInterval);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  function pointToSegmentDistance(px: number, py: number, a: Point, b: Point): number {
    const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    if (l2 === 0) return Math.hypot(px - a.x, py - a.y);
    let t = ((px - a.x) * (b.x - a.x) + (py - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a.x + t * (b.x - a.x)), py - (a.y + t * (b.y - a.y)));
  }

  function getDistanceToPath(x: number, y: number): number {
    const path = pathRef.current;
    let minDist = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      const dist = pointToSegmentDistance(x, y, path[i], path[i + 1]);
      minDist = Math.min(minDist, dist);
    }
    return minDist;
  }

  function generatePath() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const path: Point[] = [];
    const segments = 4 + stage;
    const w = canvas.width;
    const h = canvas.height;

    for (let i = 0; i <= segments; i++) {
      path.push({
        x: 40 + (w - 80) * (i / segments),
        y: h / 2 + Math.sin(i * 1.2 + stage * 0.3) * (h * 0.28),
      });
    }

    const cpInterval = Math.floor(path.length / (config.checkpointCount + 1));
    const checkpoints: Checkpoint[] = [];
    for (let i = 1; i <= config.checkpointCount; i++) {
      const idx = Math.min(i * cpInterval, path.length - 2);
      checkpoints.push({ x: path[idx].x, y: path[idx].y, collected: false });
    }

    const obstacles: Obstacle[] = [];
    if (config.obstacles) {
      const numObs = Math.min(2 + Math.floor(stage / 3), 8);
      for (let i = 0; i < numObs; i++) {
        obstacles.push({
          x: 100 + Math.random() * (w - 200),
          y: 50 + Math.random() * (h - 100),
          radius: 20 + Math.random() * 10,
          dx: (Math.random() - 0.5) * 1.5,
          dy: (Math.random() - 0.5) * 1.5,
        });
      }
    }

    pathRef.current = path;
    checkpointsRef.current = checkpoints;
    obstaclesRef.current = obstacles;
    ballRef.current = { x: path[0].x, y: path[0].y };
    setBallPos({ x: path[0].x, y: path[0].y });
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const path = pathRef.current;
    const checkpoints = checkpointsRef.current;
    const obstacles = obstaclesRef.current;

    ctx.fillStyle = '#1a1833';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw path
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = config.pathWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Path border
    ctx.strokeStyle = 'rgba(15,14,23,0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw checkpoints
    checkpoints.forEach((cp) => {
      ctx.fillStyle = cp.collected ? '#4ade80' : '#fbbf24';
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cp.collected ? '✓' : '⭐', cp.x, cp.y);
    });

    // Draw obstacles
    if (config.obstacles) {
      obstacles.forEach(obs => {
        ctx.fillStyle = '#ff6e6c';
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☠️', obs.x, obs.y);
      });
    }

    // Draw finish
    const end = path[path.length - 1];
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(end.x, end.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏁', end.x, end.y);
  }, [config]);

  const startGame = useCallback(() => {
    setPhase('playing');
    gameActiveRef.current = true;
    scoreRef.current = 0;
    collectedRef.current = 0;
    isDraggingRef.current = false;
    moveTimeRef.current = 0;
    setScore(0);
    setCollected(0);
    setFeedback('Drag to move the ball!');
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

  // Resize canvas and generate path
  useEffect(() => {
    if (phase !== 'playing') return;

    const resize = () => {
      const canvas = canvasRef.current;
      const area = gameAreaRef.current;
      if (!canvas || !area) return;
      canvas.width = area.clientWidth;
      canvas.height = area.clientHeight;
      generatePath();
      draw();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [phase, draw]);

  // Game loop
  useEffect(() => {
    if (phase !== 'playing') return;

    const endGame = (reason: EndReason) => {
      gameActiveRef.current = false;
      cancelAnimationFrame(animFrameRef.current);

      const stars = collectedRef.current >= config.checkpointCount
        ? 3
        : collectedRef.current >= Math.ceil(config.checkpointCount / 2) ? 2 : 1;

      let summary = reason === 'finish'
        ? `You made it with ${collectedRef.current}/${config.checkpointCount} stars! `
        : `You collected ${collectedRef.current}/${config.checkpointCount} stars. `;

      if (reason === 'finish') {
        if (stars === 3) summary += 'Perfect run! Your hands are super steady! 🏆';
        else if (stars === 2) summary += 'Great job! Try to collect all the stars next time.';
        else summary += 'You reached the finish! Go slower to collect more stars.';
        setFeedback('🏁 Finish! Great job!');
      } else if (reason === 'wall') {
        summary += 'You touched the wall! Go slower and watch the edges of the path.';
        setFeedback('💥 Hit the wall! Go slower next time.');
      } else {
        summary += 'You hit an obstacle! Watch for the moving dangers.';
        setFeedback('💥 Hit an obstacle! Watch out for those!');
      }

      const finalScore = reason === 'finish' ? scoreRef.current + 100 : scoreRef.current;
      setPhase('done');
      if (endedRef.current) return;
      endedRef.current = true;
      onEnd({ score: finalScore, stars, summary });
    };

    const gameLoop = () => {
      if (!gameActiveRef.current) return;

      // Update obstacles
      if (config.obstacles) {
        const canvas = canvasRef.current;
        if (canvas) {
          obstaclesRef.current.forEach(obs => {
            obs.x += obs.dx;
            obs.y += obs.dy;
            if (obs.x < obs.radius + 20 || obs.x > canvas.width - obs.radius - 20) obs.dx *= -1;
            if (obs.y < obs.radius + 20 || obs.y > canvas.height - obs.radius - 20) obs.dy *= -1;
          });
        }
      }

      draw();

      // Check collisions
      const ball = ballRef.current;
      const distToPath = getDistanceToPath(ball.x, ball.y);

      if (distToPath > config.pathWidth / 2 + 3) {
        endGame('wall');
        return;
      }

      for (const obs of obstaclesRef.current) {
        if (Math.hypot(ball.x - obs.x, ball.y - obs.y) < obs.radius + 9) {
          endGame('obstacle');
          return;
        }
      }

      checkpointsRef.current.forEach(cp => {
        if (!cp.collected && Math.hypot(ball.x - cp.x, ball.y - cp.y) < 22) {
          cp.collected = true;
          collectedRef.current++;
          setCollected(collectedRef.current);
          scoreRef.current += 50;
          setScore(scoreRef.current);
          onScore(50);
          onProgress(collectedRef.current / config.checkpointCount);
          setFeedback(STAR_FEEDBACKS[Math.floor(Math.random() * STAR_FEEDBACKS.length)]);
        }
      });

      const end = pathRef.current[pathRef.current.length - 1];
      if (Math.hypot(ball.x - end.x, ball.y - end.y) < 22) {
        endGame('finish');
        return;
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase, config, draw, onScore, onProgress]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect || !canvasRef.current) return;
    ballRef.current = {
      x: Math.max(10, Math.min(canvasRef.current.width - 10, e.clientX - rect.left)),
      y: Math.max(10, Math.min(canvasRef.current.height - 10, e.clientY - rect.top)),
    };
    setBallPos({ ...ballRef.current });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect || !canvasRef.current) return;
    ballRef.current = {
      x: Math.max(10, Math.min(canvasRef.current.width - 10, e.clientX - rect.left)),
      y: Math.max(10, Math.min(canvasRef.current.height - 10, e.clientY - rect.top)),
    };
    setBallPos({ ...ballRef.current });
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center px-4 py-2 bg-[#232146] rounded-t-xl">
        <span className="text-yellow-400 font-bold">⭐ {collected}/{config.checkpointCount}</span>
        <span className="text-purple-400">Score: {score}</span>
      </div>

      <div
        ref={gameAreaRef}
        className="flex-1 min-h-[280px] relative overflow-hidden"
        style={{ background: '#232146', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div
          className="absolute w-[18px] h-[18px] rounded-full pointer-events-none z-10"
          style={{
            background: '#ff6e6c',
            boxShadow: '0 0 12px #ff6e6c',
            left: ballPos.x - 9,
            top: ballPos.y - 9,
          }}
        />
      </div>

      <div className="text-center py-2 text-cyan-300 text-sm min-h-[24px]">{feedback}</div>
    </div>
  );
}

export default SteadyHandsGame;
