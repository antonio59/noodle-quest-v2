import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

interface ShapeDef {
  type: string;
  name: string;
  tolerance: number;
}

const SHAPES_BY_STAGE: Record<number, ShapeDef[]> = {
  1: [
    { type: 'circle', name: 'Circle', tolerance: 35 },
    { type: 'square', name: 'Square', tolerance: 35 },
  ],
  2: [
    { type: 'circle', name: 'Circle', tolerance: 32 },
    { type: 'square', name: 'Square', tolerance: 32 },
    { type: 'triangle', name: 'Triangle', tolerance: 32 },
  ],
  3: [
    { type: 'star', name: 'Star', tolerance: 30 },
    { type: 'diamond', name: 'Diamond', tolerance: 30 },
  ],
  4: [
    { type: 'star', name: 'Star', tolerance: 28 },
    { type: 'spiral', name: 'Spiral', tolerance: 28 },
  ],
  5: [
    { type: 'heart', name: 'Heart', tolerance: 26 },
    { type: 'spiral', name: 'Spiral', tolerance: 26 },
  ],
  6: [
    { type: 'heart', name: 'Heart', tolerance: 24 },
    { type: 'infinity', name: 'Infinity', tolerance: 24 },
    { type: 'star', name: 'Star', tolerance: 24 },
  ],
  7: [
    { type: 'heart', name: 'Heart', tolerance: 22 },
    { type: 'infinity', name: 'Infinity', tolerance: 22 },
    { type: 'flower', name: 'Flower', tolerance: 22 },
  ],
  8: [
    { type: 'flower', name: 'Flower', tolerance: 20 },
    { type: 'infinity', name: 'Infinity', tolerance: 20 },
    { type: 'wave', name: 'Wave', tolerance: 20 },
  ],
  9: [
    { type: 'flower', name: 'Flower', tolerance: 18 },
    { type: 'wave', name: 'Wave', tolerance: 18 },
    { type: 'zigzag', name: 'Zigzag', tolerance: 18 },
  ],
  10: [
    { type: 'heart', name: 'Heart', tolerance: 16 },
    { type: 'flower', name: 'Flower', tolerance: 16 },
    { type: 'infinity', name: 'Infinity', tolerance: 16 },
    { type: 'zigzag', name: 'Zigzag', tolerance: 16 },
  ],
  11: [
    { type: 'heart', name: 'Heart', tolerance: 15 },
    { type: 'flower', name: 'Flower', tolerance: 15 },
    { type: 'infinity', name: 'Infinity', tolerance: 15 },
    { type: 'zigzag', name: 'Zigzag', tolerance: 15 },
    { type: 'wave', name: 'Wave', tolerance: 15 },
  ],
  12: [
    { type: 'heart', name: 'Heart', tolerance: 14 },
    { type: 'flower', name: 'Flower', tolerance: 14 },
    { type: 'infinity', name: 'Infinity', tolerance: 14 },
    { type: 'wave', name: 'Wave', tolerance: 14 },
    { type: 'spiral', name: 'Spiral', tolerance: 14 },
  ],
  13: [
    { type: 'heart', name: 'Heart', tolerance: 13 },
    { type: 'flower', name: 'Flower', tolerance: 13 },
    { type: 'infinity', name: 'Infinity', tolerance: 13 },
    { type: 'wave', name: 'Wave', tolerance: 13 },
    { type: 'zigzag', name: 'Zigzag', tolerance: 13 },
    { type: 'star', name: 'Star', tolerance: 13 },
  ],
  14: [
    { type: 'heart', name: 'Heart', tolerance: 12 },
    { type: 'flower', name: 'Flower', tolerance: 12 },
    { type: 'infinity', name: 'Infinity', tolerance: 12 },
    { type: 'wave', name: 'Wave', tolerance: 12 },
    { type: 'zigzag', name: 'Zigzag', tolerance: 12 },
    { type: 'spiral', name: 'Spiral', tolerance: 12 },
  ],
  15: [
    { type: 'heart', name: 'Heart', tolerance: 11 },
    { type: 'flower', name: 'Flower', tolerance: 11 },
    { type: 'infinity', name: 'Infinity', tolerance: 11 },
    { type: 'wave', name: 'Wave', tolerance: 11 },
    { type: 'zigzag', name: 'Zigzag', tolerance: 11 },
    { type: 'star', name: 'Star', tolerance: 11 },
    { type: 'spiral', name: 'Spiral', tolerance: 11 },
  ],
  16: [
    { type: 'heart', name: 'Heart', tolerance: 10 },
    { type: 'flower', name: 'Flower', tolerance: 10 },
    { type: 'infinity', name: 'Infinity', tolerance: 10 },
    { type: 'wave', name: 'Wave', tolerance: 10 },
    { type: 'zigzag', name: 'Zigzag', tolerance: 10 },
    { type: 'star', name: 'Star', tolerance: 10 },
    { type: 'spiral', name: 'Spiral', tolerance: 10 },
  ],
  17: [
    { type: 'heart', name: 'Heart', tolerance: 9 },
    { type: 'flower', name: 'Flower', tolerance: 9 },
    { type: 'infinity', name: 'Infinity', tolerance: 9 },
    { type: 'wave', name: 'Wave', tolerance: 9 },
    { type: 'zigzag', name: 'Zigzag', tolerance: 9 },
    { type: 'star', name: 'Star', tolerance: 9 },
    { type: 'spiral', name: 'Spiral', tolerance: 9 },
  ],
  18: [
    { type: 'heart', name: 'Heart', tolerance: 8 },
    { type: 'flower', name: 'Flower', tolerance: 8 },
    { type: 'infinity', name: 'Infinity', tolerance: 8 },
    { type: 'wave', name: 'Wave', tolerance: 8 },
    { type: 'zigzag', name: 'Zigzag', tolerance: 8 },
    { type: 'star', name: 'Star', tolerance: 8 },
    { type: 'spiral', name: 'Spiral', tolerance: 8 },
  ],
  19: [
    { type: 'heart', name: 'Heart', tolerance: 7 },
    { type: 'flower', name: 'Flower', tolerance: 7 },
    { type: 'infinity', name: 'Infinity', tolerance: 7 },
    { type: 'wave', name: 'Wave', tolerance: 7 },
    { type: 'zigzag', name: 'Zigzag', tolerance: 7 },
    { type: 'star', name: 'Star', tolerance: 7 },
    { type: 'spiral', name: 'Spiral', tolerance: 7 },
  ],
  20: [
    { type: 'heart', name: 'Heart', tolerance: 6 },
    { type: 'flower', name: 'Flower', tolerance: 6 },
    { type: 'infinity', name: 'Infinity', tolerance: 6 },
    { type: 'wave', name: 'Wave', tolerance: 6 },
    { type: 'zigzag', name: 'Zigzag', tolerance: 6 },
    { type: 'star', name: 'Star', tolerance: 6 },
    { type: 'spiral', name: 'Spiral', tolerance: 6 },
  ],
};

const TIPS = [
  '💡 Tip: Trace slowly and carefully for the best accuracy!',
  '💡 Tip: Keep your finger or mouse on the line as you trace!',
  '💡 Tip: Look at the whole shape before you start tracing!',
  '💡 Tip: Go at your own pace — accuracy matters more than speed!',
  '💡 Tip: Practice makes perfect — each shape gets easier!',
];

interface Point {
  x: number;
  y: number;
}

function getShapePoints(type: string, cx: number, cy: number, size: number): Point[] {
  const pts: Point[] = [];

  if (type === 'circle') {
    for (let i = 0; i <= 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(angle) * size, y: cy + Math.sin(angle) * size });
    }
  } else if (type === 'square') {
    const s = size * 0.8;
    for (let i = 0; i <= 20; i++) pts.push({ x: cx - s + (i / 20) * s * 2, y: cy - s });
    for (let i = 0; i <= 20; i++) pts.push({ x: cx + s, y: cy - s + (i / 20) * s * 2 });
    for (let i = 0; i <= 20; i++) pts.push({ x: cx + s - (i / 20) * s * 2, y: cy + s });
    for (let i = 0; i <= 20; i++) pts.push({ x: cx - s, y: cy + s - (i / 20) * s * 2 });
  } else if (type === 'triangle') {
    const h = size * 0.9;
    for (let i = 0; i <= 25; i++) pts.push({ x: cx + (i / 25) * size, y: cy - h / 2 + (i / 25) * h });
    for (let i = 0; i <= 25; i++) pts.push({ x: cx + size - (i / 25) * size * 2, y: cy + h / 2 });
    for (let i = 0; i <= 25; i++) pts.push({ x: cx - size + (i / 25) * size, y: cy + h / 2 - (i / 25) * h });
  } else if (type === 'diamond') {
    const s = size * 0.9;
    for (let i = 0; i <= 20; i++) pts.push({ x: cx + (i / 20) * s, y: cy - s + (i / 20) * s });
    for (let i = 0; i <= 20; i++) pts.push({ x: cx + s - (i / 20) * s, y: cy + (i / 20) * s });
    for (let i = 0; i <= 20; i++) pts.push({ x: cx - (i / 20) * s, y: cy + s - (i / 20) * s });
    for (let i = 0; i <= 20; i++) pts.push({ x: cx - s + (i / 20) * s, y: cy - (i / 20) * s });
  } else if (type === 'star') {
    for (let i = 0; i <= 50; i++) {
      const angle = (i / 10) * Math.PI * 2 / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? size : size * 0.4;
      pts.push({
        x: cx + Math.cos(angle + (i / 50) * Math.PI * 2) * r,
        y: cy + Math.sin(angle + (i / 50) * Math.PI * 2) * r,
      });
    }
  } else if (type === 'spiral') {
    for (let i = 0; i <= 100; i++) {
      const angle = (i / 100) * Math.PI * 4;
      const r = (i / 100) * size;
      pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
  } else if (type === 'heart') {
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push({ x: cx + (x * size) / 16, y: cy + (y * size) / 16 });
    }
  } else if (type === 'infinity') {
    for (let i = 0; i <= 80; i++) {
      const t = (i / 80) * Math.PI * 2;
      const scale = 1 / (1 + Math.sin(t) * Math.sin(t));
      const x = Math.cos(t) * size * scale;
      const y = Math.sin(t) * Math.cos(t) * size * scale;
      pts.push({ x: cx + x, y: cy + y });
    }
  } else if (type === 'flower') {
    for (let i = 0; i <= 80; i++) {
      const angle = (i / 80) * Math.PI * 2;
      const r = size * (0.5 + 0.5 * Math.cos(angle * 6));
      pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
  } else if (type === 'wave') {
    for (let i = 0; i <= 80; i++) {
      const x = cx - size + (i / 80) * size * 2;
      const y = cy + Math.sin((i / 80) * Math.PI * 4) * size * 0.5;
      pts.push({ x, y });
    }
  } else if (type === 'zigzag') {
    const segments = 6;
    for (let i = 0; i <= segments * 10; i++) {
      const seg = Math.floor(i / 10);
      const t = (i % 10) / 10;
      const x = cx - size + (i / (segments * 10)) * size * 2;
      const y =
        cy +
        (seg % 2 === 0 ? -1 : 1) * size * 0.4 * (1 - t) +
        (seg % 2 === 0 ? 1 : -1) * size * 0.4 * t;
      pts.push({ x, y });
    }
  }

  return pts;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pathPoints: Point[],
  drawnPoints: Point[],
) {
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(192,132,252,0.4)';
  ctx.lineWidth = 6;
  ctx.setLineDash([10, 10]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  pathPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  pathPoints.forEach((p, i) => {
    if (i % 8 === 0) {
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  if (drawnPoints.length > 1) {
    ctx.strokeStyle = '#ff6e6c';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    drawnPoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }
}

type Phase = 'intro' | 'playing' | 'done';

function useThreeParticles(containerRef: React.RefObject<HTMLDivElement | null>) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const particlesRef = useRef<{ pos: THREE.Vector3; vel: THREE.Vector3; life: number; color: THREE.Color }[]>([]);
  const frameRef = useRef<number>(0);
  const meshRef = useRef<THREE.Points | null>(null);
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
    canvas.style.zIndex = '10';
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const w = container.clientWidth || 300;
    const h = container.clientHeight || 300;
    canvas.width = w;
    canvas.height = h;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(0, w, 0, h, -100, 100);
    cameraRef.current = camera;

    const MAX = 500;
    const positions = new Float32Array(MAX * 3);
    const colors = new Float32Array(MAX * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.PointsMaterial({
      size: 6,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false,
    });
    const mesh = new THREE.Points(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    let lastTime = 0;
    const animate = (time: number) => {
      frameRef.current = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 1000, 0.1);
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
        col[i * 3] = ps[i].color.r * (ps[i].life / 1.5);
        col[i * 3 + 1] = ps[i].color.g * (ps[i].life / 1.5);
        col[i * 3 + 2] = ps[i].color.b * (ps[i].life / 1.5);
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.setDrawRange(0, count);

      (material as THREE.PointsMaterial).opacity = 0.9;
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

  const addParticles = useCallback((x: number, y: number, color = '#c084fc') => {
    const c = new THREE.Color(color);
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      particlesRef.current.push({
        pos: new THREE.Vector3(x, y, 0),
        vel: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0),
        life: 0.6 + Math.random() * 0.4,
        color: c.clone(),
      });
    }
  }, []);

  const burstParticles = useCallback((x: number, y: number) => {
    const burstColors = ['#fbbf24', '#4ade80', '#c084fc', '#67e8f9', '#ff6e6c'];
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      const c = new THREE.Color(burstColors[Math.floor(Math.random() * burstColors.length)]);
      particlesRef.current.push({
        pos: new THREE.Vector3(x, y, 0),
        vel: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0),
        life: 0.8 + Math.random() * 0.7,
        color: c,
      });
    }
  }, []);

  return { addParticles, burstParticles };
}

function PatternPainterGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const shapes = SHAPES_BY_STAGE[stage] || SHAPES_BY_STAGE[10];
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentShape, setCurrentShape] = useState(0);
  const [drawnPoints, setDrawnPoints] = useState<Point[]>([]);
  const [tracing, setTracing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#67e8f9');
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const [cumulativeScore, setCumulativeScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathPointsRef = useRef<Point[]>([]);
  const gameActiveRef = useRef(false);
  const { addParticles, burstParticles } = useThreeParticles(containerRef);

  const resizeAndDraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const size = Math.min(canvas.width, canvas.height) * 0.32;
    const shape = shapes[currentShape];
    if (!shape) return;
    pathPointsRef.current = getShapePoints(shape.type, cx, cy, size);
    const ctx = canvas.getContext('2d');
    if (ctx) drawScene(ctx, canvas.width, canvas.height, pathPointsRef.current, drawnPoints);
  }, [shapes, currentShape, drawnPoints]);

  useEffect(() => {
    if (phase !== 'playing') return;
    // Wait one frame for layout so getBoundingClientRect returns real dimensions
    const rafId = requestAnimationFrame(() => {
      resizeAndDraw();
    });
    window.addEventListener('resize', resizeAndDraw);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeAndDraw);
    };
  }, [phase, resizeAndDraw]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    drawScene(ctx, canvasRef.current.width, canvasRef.current.height, pathPointsRef.current, drawnPoints);
  }, [drawnPoints, phase]);

  const getCanvasPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      setTracing(true);
      setDrawnPoints([getCanvasPoint(e)]);
      setFeedback('Keep tracing along the dotted line...');
      setFeedbackColor('#67e8f9');
    },
    [getCanvasPoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!tracing) return;
      e.preventDefault();
      const point = getCanvasPoint(e);
      setDrawnPoints(prev => [...prev, point]);
      addParticles(point.x, point.y, '#c084fc');
    },
    [tracing, getCanvasPoint, addParticles],
  );

  const handlePointerUp = useCallback(() => {
    setTracing(false);
  }, []);

  const handleClear = useCallback(() => {
    setDrawnPoints([]);
    setFeedback('Cleared! Try again — trace the dotted line.');
    setFeedbackColor('#67e8f9');
  }, []);

  const handleDone = useCallback(() => {
    if (drawnPoints.length < 15) {
      setFeedback('✏️ Draw more! Trace along the whole shape.');
      setFeedbackColor('#fbbf24');
      return;
    }

    const path = pathPointsRef.current;
    const shape = shapes[currentShape];
    let closePoints = 0;

    drawnPoints.forEach(p => {
      let minDist = Infinity;
      path.forEach(pp => {
        const dist = Math.hypot(p.x - pp.x, p.y - pp.y);
        minDist = Math.min(minDist, dist);
      });
      if (minDist < shape.tolerance) closePoints++;
    });

    const accuracy = closePoints / drawnPoints.length;
    const shapeScore = Math.round(accuracy * 100);
    let passed = false;

    if (accuracy > 0.7) {
      passed = true;
      setCumulativeScore(prev => prev + shapeScore);
      onScore(shapeScore);
      setFeedback(`✨ Great tracing! ${shapeScore}% accuracy!`);
      setFeedbackColor('#4ade80');
      if (canvasRef.current) {
        burstParticles(canvasRef.current.width / 2, canvasRef.current.height / 2);
      }
    } else if (accuracy > 0.5) {
      passed = true;
      const pts = Math.round(shapeScore * 0.7);
      setCumulativeScore(prev => prev + pts);
      onScore(pts);
      setFeedback(`👍 Good effort! ${shapeScore}% — try to stay closer to the dots next time.`);
      setFeedbackColor('#fbbf24');
    } else if (accuracy > 0.3) {
      setFeedback(`💡 ${shapeScore}% — Focus on connecting the purple dots one at a time!`);
      setFeedbackColor('#fbbf24');
    } else {
      setFeedback('💡 Try following the dotted line more closely. Start at any dot and trace around!');
      setFeedbackColor('#ff6e6c');
    }

    const nextShape = currentShape + 1;
    onProgress(nextShape / shapes.length);

    if (nextShape >= shapes.length) {
      setCumulativeScore(prev => {
        const finalScore = passed
          ? (accuracy > 0.7 ? prev + shapeScore : prev + Math.round(shapeScore * 0.7))
          : prev;
        const avgScore = finalScore / shapes.length;
        const stars = avgScore > 75 ? 3 : avgScore > 50 ? 2 : 1;
        let summary = `You traced all ${shapes.length} shapes! `;
        if (stars === 3) summary += 'Beautiful work! Your hand-eye coordination is fantastic! 🌟';
        else if (stars === 2) summary += 'Good tracing! Keep practicing to get even more precise.';
        else summary += 'Nice effort! Remember: slow and steady, follow those dots!';
        onMessage('All shapes traced!');
        setPhase('done');
        setTimeout(() => onEnd({ score: finalScore, stars, summary }), 0);
        return finalScore;
      });
    } else if (passed) {
      setTimeout(() => {
        setCurrentShape(nextShape);
        setDrawnPoints([]);
        const name = shapes[nextShape].name;
        setFeedback(`Next shape: ${name}! Trace the dotted line.`);
        setFeedbackColor('#67e8f9');
      }, 1200);
    }
  }, [drawnPoints, shapes, currentShape, onScore, onProgress, onMessage, onEnd, burstParticles]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-6 text-center">
        <div className="text-6xl mb-4">🎨</div>
        <h2 className="text-2xl font-bold text-accent mb-2">Pattern Painter</h2>
        <p className="text-text-dim mb-4 max-w-xs">Trace the dotted shapes with your finger or mouse!</p>

        <div className="bg-card rounded-xl p-4 mb-5 max-w-sm">
          <div className="text-primary text-sm mb-2">
            You'll trace {shapes.length} shape{shapes.length > 1 ? 's' : ''}:
          </div>
          <div className="flex gap-2 justify-center flex-wrap text-accent text-lg">
            {shapes.map(s => s.name).join(' → ')}
          </div>
        </div>

        <div className="bg-surface rounded-lg p-3 mb-4 max-w-xs">
          <div className="text-accent text-sm mb-1">How to trace well:</div>
          <div className="text-text-dim text-xs text-left">
            • Follow the <span className="text-accent">purple dotted line</span><br />
            • Hit the <span className="text-accent">purple dots</span> as you go<br />
            • Tap <span className="text-success">Done</span> when finished
          </div>
        </div>

        <p className="text-primary text-sm mb-5 max-w-xs">{tip}</p>

        <button
          onClick={() => { gameActiveRef.current = true; setPhase('playing'); }}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95"
        >
          Start Tracing! ✏️
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const avgScore = cumulativeScore / shapes.length;
    const stars = avgScore > 75 ? 3 : avgScore > 50 ? 2 : 1;
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-6 text-center">
        <div className="text-6xl mb-4">{stars === 3 ? '🌟' : stars === 2 ? '⭐' : '✨'}</div>
        <h2 className="text-2xl font-bold text-accent mb-2">All Done!</h2>
        <p className="text-text-dim mb-4">You traced all {shapes.length} shapes!</p>
        <div className="bg-card rounded-xl p-4 mb-5 max-w-sm">
          <div className="text-lg mb-1">Score: {cumulativeScore}</div>
          <div className="text-accent">Accuracy: {Math.round(avgScore)}%</div>
          <div className="text-warning mt-1">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[350px]">
      <div className="flex justify-between items-center px-4 py-2 bg-card rounded-t-xl">
        <span className="text-accent font-bold">
          Draw: <span>{shapes[currentShape]?.name}</span>
        </span>
        <span className="text-primary text-sm">
          {currentShape + 1}/{shapes.length}
        </span>
      </div>

      <div ref={containerRef} className="flex-1 min-h-[250px] relative">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full bg-card cursor-crosshair block"
          style={{ touchAction: 'none' }}
        />
      </div>

      <div className="text-center py-1.5 text-sm min-h-[22px]" style={{ color: feedbackColor }}>
        {feedback || 'Trace the dotted line!'}
      </div>

      <div className="flex gap-3 px-3 py-2.5 justify-center bg-surface rounded-b-xl">
        <button
          onClick={handleClear}
          className="bg-text-muted text-bg font-bold px-5 py-2.5 rounded-xl hover:opacity-90 active:scale-95"
        >
          🗑️ Clear
        </button>
        <button
          onClick={handleDone}
          className="bg-success text-bg font-bold px-5 py-2.5 rounded-xl hover:opacity-90 active:scale-95"
        >
          ✓ Done!
        </button>
      </div>
    </div>
  );
}

registerGame('pattern-painter', {
  name: 'Pattern Painter',
  emoji: '🎨',
  description: 'Trace the shapes with your finger or mouse!',
  category: 'motor',
  stages: 20,
  component: PatternPainterGame,
});

export default PatternPainterGame;
