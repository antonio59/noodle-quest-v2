import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

interface Point { x: number; y: number }
interface Checkpoint { x: number; y: number; collected: boolean }
interface Obstacle { x: number; y: number; radius: number; dx: number; dy: number }

type Phase = 'intro' | 'playing' | 'done';
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
  11: { pathWidth: 26, obstacles: true, checkpointCount: 7 },
  12: { pathWidth: 24, obstacles: true, checkpointCount: 7 },
  13: { pathWidth: 22, obstacles: true, checkpointCount: 8 },
  14: { pathWidth: 20, obstacles: true, checkpointCount: 8 },
  15: { pathWidth: 19, obstacles: true, checkpointCount: 9 },
  16: { pathWidth: 18, obstacles: true, checkpointCount: 9 },
  17: { pathWidth: 17, obstacles: true, checkpointCount: 10 },
  18: { pathWidth: 16, obstacles: true, checkpointCount: 10 },
  19: { pathWidth: 15, obstacles: true, checkpointCount: 11 },
  20: { pathWidth: 14, obstacles: true, checkpointCount: 12 },
};

const TIPS = [
  "💡 Tip: Go SLOW! There's no time limit — steady beats fast.",
  "💡 Tip: Focus on the path just ahead of the ball, not the whole maze.",
  "💡 Tip: Keep your hand/finger relaxed — tension makes you shake!",
  "💡 Tip: Collect the stars as you go — they mark your progress!",
  "💡 Tip: If you hit a wall, no worries! Just be more careful next time.",
];

const STAR_FEEDBACKS = ["Star collected! ⭐", "Nice! Keep going! 🌟", "Great control! ✨"];

function useThreeTrail(containerRef: React.RefObject<HTMLDivElement | null>) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const particlesRef = useRef<{pos: THREE.Vector3, vel: THREE.Vector3, life: number, maxLife: number, color: THREE.Color}[]>([]);
  const frameRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '5';
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const w = container.clientWidth || 300;
    const h = container.clientHeight || 300;
    canvas.width = w;
    canvas.height = h;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(0, w, 0, h, -10, 10);
    cameraRef.current = camera;

    const MAX = 600;
    const positions = new Float32Array(MAX * 3);
    const colors = new Float32Array(MAX * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      transparent: true,
      sizeAttenuation: false,
    });
    scene.add(new THREE.Points(geometry, material));

    let lastTime = 0;
    const animate = (time: number) => {
      frameRef.current = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        ps[i].pos.addScaledVector(ps[i].vel, dt);
        ps[i].life -= dt;
        if (ps[i].life <= 0) ps.splice(i, 1);
      }

      const count = Math.min(ps.length, MAX);
      const pos = geometry.attributes.position.array as Float32Array;
      const col = geometry.attributes.color.array as Float32Array;
      for (let i = 0; i < count; i++) {
        pos[i * 3] = ps[i].pos.x;
        pos[i * 3 + 1] = ps[i].pos.y;
        pos[i * 3 + 2] = 0;
        const fade = ps[i].life / ps[i].maxLife;
        col[i * 3] = ps[i].color.r * fade;
        col[i * 3 + 1] = ps[i].color.g * fade;
        col[i * 3 + 2] = ps[i].color.b * fade;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.setDrawRange(0, count);
      renderer.render(scene, camera);
    };
    frameRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      const w2 = container.clientWidth || 300;
      const h2 = container.clientHeight || 300;
      canvas.width = w2;
      canvas.height = h2;
      renderer.setSize(w2, h2);
      camera.right = w2;
      camera.bottom = h2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.removeChild(canvas);
    };
  }, [containerRef]);

  const addTrail = useCallback((x: number, y: number) => {
    if (particlesRef.current.length > 400) return;
    const life = 0.3 + Math.random() * 0.2;
    particlesRef.current.push({
      pos: new THREE.Vector3(x + (Math.random()-0.5)*4, y + (Math.random()-0.5)*4, 0),
      vel: new THREE.Vector3((Math.random()-0.5)*10, (Math.random()-0.5)*10, 0),
      life,
      maxLife: life,
      color: new THREE.Color('#c084fc'),
    });
  }, []);

  const explosion = useCallback((x: number, y: number, color = '#ff6e6c') => {
    const c = new THREE.Color(color);
    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 50 + Math.random() * 100;
      const life = 0.5 + Math.random() * 0.5;
      particlesRef.current.push({
        pos: new THREE.Vector3(x, y, 0),
        vel: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0),
        life,
        maxLife: life,
        color: c.clone(),
      });
    }
  }, []);

  return { addTrail, explosion };
}

function SteadyHandsGame({ stage, onScore, onProgress, onEnd }: GameProps) {
  const config = CONFIG[stage] || CONFIG[10];
  const [phase, setPhase] = useState<Phase>('intro');
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
  const graceRef = useRef(true);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  const { addTrail, explosion } = useThreeTrail(gameAreaRef);

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
      const numObs = Math.min(2 + Math.floor(stage / 3), 4);
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
    graceRef.current = true;
    setTimeout(() => { graceRef.current = false; }, 600);
    setScore(0);
    setCollected(0);
    setFeedback('Drag to move the ball!');
  }, []);

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
        explosion(ballRef.current.x, ballRef.current.y, '#ff6e6c');
        summary += 'You touched the wall! Go slower and watch the edges of the path.';
        setFeedback('💥 Hit the wall! Go slower next time.');
      } else {
        explosion(ballRef.current.x, ballRef.current.y, '#fbbf24');
        summary += 'You hit an obstacle! Watch for the moving dangers.';
        setFeedback('💥 Hit an obstacle! Watch out for those!');
      }

      const finalScore = reason === 'finish' ? scoreRef.current + 100 : scoreRef.current;
      setPhase('done');
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

      if (!graceRef.current && distToPath > config.pathWidth / 2 + 3) {
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
          explosion(cp.x, cp.y, '#fbbf24');
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
  }, [phase, config, draw, onScore, onProgress, explosion]);

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
    addTrail(ballRef.current.x, ballRef.current.y);
  }, [addTrail]);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-5 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-green-400 mb-2">Steady Hands</h2>
        <p className="text-green-300 mb-4 max-w-xs">Guide the ball through the path without touching the walls!</p>

        <div className="bg-[#232146] rounded-xl p-4 mb-5 max-w-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-5 rounded-full bg-red-400" style={{ boxShadow: '0 0 10px #ff6e6c' }} />
            <span className="text-white text-sm">This is your ball — drag it!</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-xs">⭐</div>
            <span className="text-yellow-400 text-sm">Collect {config.checkpointCount} stars on the way</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center text-xs">🏁</div>
            <span className="text-green-400 text-sm">Reach the finish!</span>
          </div>
          {config.obstacles && <div className="text-red-400 mt-3 text-sm">⚠️ Watch out for moving obstacles!</div>}
        </div>

        <p className="text-cyan-300 text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={startGame}
          className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-xl text-lg active:scale-95 transition-transform"
        >
          Start Game! 🎯
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center px-4 py-2 bg-[#232146] rounded-t-xl">
        <span className="text-yellow-400 font-bold">⭐ {collected}/{config.checkpointCount}</span>
        <span className="text-purple-400">Score: {score}</span>
      </div>

      <div
        ref={gameAreaRef}
        className="flex-1 min-h-[280px] relative overflow-hidden"
        style={{ background: '#232146', touchAction: 'none', position: 'relative' }}
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

registerGame('steady-hands', {
  name: 'Steady Hands',
  emoji: '🎯',
  description: 'Guide the ball through the winding path without touching the walls!',
  category: 'motor',
  stages: 20,
  component: SteadyHandsGame,
});

export default SteadyHandsGame;
