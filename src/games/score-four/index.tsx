import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GameProps } from '@/types';
import { webglSupported } from '@/lib/webgl';
import { playPlace, playCapture } from '@/lib/feedback';
import {
  N, newBoard, drop, landingY, isFull, winningLine, bestRod, idx,
  type Board, type Cell, type Player, type Rod,
} from './logic';

const P1_COLOR = '#f0a83a'; // you / player 1
const P2_COLOR = '#f59e0b'; // AI / player 2
const SPACING = 1.15;

/** Board coordinate → world position (board centred on origin). */
function worldPos(x: number, y: number, z: number): [number, number, number] {
  const off = ((N - 1) / 2) * SPACING;
  return [x * SPACING - off, y * SPACING + 0.55, z * SPACING - off];
}

interface Bead {
  key: number;
  x: number;
  y: number;
  z: number;
  player: Player;
  winning: boolean;
}

/** Rebuild bead list from a flat board; keys are flat indices (stable across syncs). */
function beadsFromBoard(board: Board, winLine: number[] | null): Bead[] {
  const out: Bead[] = [];
  for (let y = 0; y < N; y++) {
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        const i = idx(x, y, z);
        const cell = board[i] as Cell;
        if (cell) {
          out.push({
            key: i,
            x, y, z,
            player: cell,
            winning: winLine?.includes(i) ?? false,
          });
        }
      }
    }
  }
  return out;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function BeadMesh({ bead }: { bead: Bead }) {
  const ref = useRef<THREE.Mesh>(null);
  const [tx, ty, tz] = worldPos(bead.x, bead.y, bead.z);
  // Drop-in animation start height; state initializer so it's computed
  // once without reading a ref during render.
  const [startY] = useState(() => (reducedMotion() ? ty : ty + 4));

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (mesh.position.y > ty) {
      mesh.position.y = Math.max(ty, mesh.position.y - delta * 12);
    }
  });

  return (
    <mesh ref={ref} position={[tx, startY, tz]}>
      <sphereGeometry args={[0.42, 24, 24]} />
      <meshStandardMaterial
        color={bead.player === 1 ? P1_COLOR : P2_COLOR}
        emissive={bead.winning ? (bead.player === 1 ? P1_COLOR : P2_COLOR) : '#000000'}
        emissiveIntensity={bead.winning ? 0.6 : 0}
        roughness={0.35}
        metalness={0.15}
      />
    </mesh>
  );
}

interface SceneProps {
  beads: Bead[];
  cursor: Rod | null;
  hover: Rod | null;
  onRodClick: (rod: Rod) => void;
  onRodHover: (rod: Rod | null) => void;
  yaw: number;
  pitch: number;
}

function Scene({ beads, cursor, hover, onRodClick, onRodHover, yaw, pitch }: SceneProps) {
  const rods = useMemo(() => {
    const out: Rod[] = [];
    for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) out.push({ x, z });
    return out;
  }, []);

  return (
    <group rotation={[pitch, yaw, 0]}>
      {/* Base plate */}
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[N * SPACING + 0.9, 0.3, N * SPACING + 0.9]} />
        <meshStandardMaterial color="#1a332e" roughness={0.8} />
      </mesh>

      {/* Rods + fat invisible hit targets */}
      {rods.map(rod => {
        const [wx, , wz] = worldPos(rod.x, 0, rod.z);
        const isCursor = cursor?.x === rod.x && cursor?.z === rod.z;
        const isHover = hover?.x === rod.x && hover?.z === rod.z;
        const rodH = (N - 1) * SPACING + 1.1;
        return (
          <group key={`${rod.x}-${rod.z}`} position={[wx, 0, wz]}>
            <mesh position={[0, rodH / 2, 0]}>
              <cylinderGeometry args={[0.06, 0.06, rodH, 10]} />
              <meshStandardMaterial
                color={isCursor ? '#fbbf24' : isHover ? '#f0a83a' : '#3a5a52'}
                emissive={isCursor ? '#fbbf24' : isHover ? '#f0a83a' : '#000000'}
                emissiveIntensity={isCursor || isHover ? 0.45 : 0}
                roughness={0.5}
              />
            </mesh>
            <mesh
              position={[0, rodH / 2, 0]}
              visible={false}
              onClick={e => { e.stopPropagation(); onRodClick(rod); }}
              onPointerOver={e => { e.stopPropagation(); onRodHover(rod); }}
              onPointerOut={() => onRodHover(null)}
            >
              <cylinderGeometry args={[0.5, 0.5, rodH + 0.6, 8]} />
            </mesh>
          </group>
        );
      })}

      {beads.map(b => <BeadMesh key={b.key} bead={b} />)}

      <ambientLight intensity={0.65} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} />
      <directionalLight position={[-5, 6, -6]} intensity={0.35} />
    </group>
  );
}

function ScoreFourGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty, multiplayerState, onMultiplayerMove }: GameProps) {
  const isOnline = !!multiplayerState;
  const myPlayer: Player = isOnline
    ? (multiplayerState.playerNumber === 1 ? 1 : 2)
    : 1;
  const otherPlayer: Player = myPlayer === 1 ? 2 : 1;

  const difficulty = aiDifficulty || 'medium';
  const [started, setStarted] = useState(false);
  const [beads, setBeads] = useState<Bead[]>([]);
  const [turn, setTurn] = useState<Player>(1);
  const [over, setOver] = useState(false);
  const [cursor, setCursor] = useState<Rod | null>(null);
  const [hover, setHover] = useState<Rod | null>(null);
  const [view, setView] = useState({ yaw: 0.6, pitch: 0.12 });

  const boardRef = useRef<Board>(newBoard());
  const keyRef = useRef(0);
  const endedRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number; moved: boolean } | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const supported = useMemo(webglSupported, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => { if (!endedRef.current) fn(); }, ms);
    timeoutsRef.current.push(id);
  }, []);

  useEffect(() => {
    endedRef.current = false;
    return () => {
      endedRef.current = true;
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Hydrate from multiplayer boardState
  useEffect(() => {
    if (!isOnline || !multiplayerState) return;
    const bs = multiplayerState.boardState as {
      board?: Board;
      last?: { x: number; y: number; z: number; player: Player };
    } | null | undefined;
    if (bs && Array.isArray(bs.board)) {
      boardRef.current = [...bs.board];
      const last = bs.last;
      let line: number[] | null = null;
      if (last) {
        line = winningLine(bs.board, last.player);
      }
      const nextBeads = beadsFromBoard(bs.board, line);
      setBeads(nextBeads);
      keyRef.current = Math.max(keyRef.current, ...nextBeads.map(b => b.key + 1), 0);
      setTurn(multiplayerState.currentPlayer === 1 ? 1 : 2);

      if (last && line) {
        setOver(true);
        if (!endedRef.current) {
          endedRef.current = true;
          const won = last.player === myPlayer;
          onEnd({
            score: won ? 130 : 10,
            stars: won ? 3 : 1,
            summary: won ? 'Four in a row in 3D — brilliant!' : 'Opponent lined up four.',
          });
        }
      } else if (isFull(bs.board)) {
        setOver(true);
        if (!endedRef.current) {
          endedRef.current = true;
          onEnd({ score: 40, stars: 2, summary: 'Every rod is full — a draw!' });
        }
      }
    }
  }, [isOnline, multiplayerState, myPlayer, onEnd]);

  const finish = useCallback((result: 'win' | 'lose' | 'draw') => {
    if (endedRef.current) return;
    endedRef.current = true;
    setOver(true);
    const score = result === 'win' ? 130 : result === 'draw' ? 40 : 10;
    const stars = result === 'win' ? 3 : result === 'draw' ? 2 : 1;
    const summary =
      result === 'win' ? 'Four in a row in 3D — brilliant!'
      : result === 'draw' ? 'Every rod is full — a draw!'
      : 'The AI lined up four first. Study the diagonals!';
    onScore(score);
    onProgress(result === 'win' ? 1 : 0.4);
    schedule(() => onEnd({ score, stars, summary }), 1100);
  }, [onScore, onProgress, onEnd, schedule]);

  const markWinning = useCallback((line: number[]) => {
    setBeads(prev => prev.map(b => (line.includes(idx(b.x, b.y, b.z)) ? { ...b, winning: true } : b)));
  }, []);

  const place = useCallback((rod: Rod, player: Player): number => {
    const y = drop(boardRef.current, rod.x, rod.z, player);
    if (y < 0) return -1;
    playPlace();
    const key = idx(rod.x, y, rod.z);
    keyRef.current = Math.max(keyRef.current, key + 1);
    setBeads(prev => [...prev, { key, x: rod.x, y, z: rod.z, player, winning: false }]);
    return y;
  }, []);

  const handleDrop = useCallback((rod: Rod) => {
    if (endedRef.current || over) return;
    if (landingY(boardRef.current, rod.x, rod.z) < 0) return;

    if (isOnline) {
      if (turn !== myPlayer) return;
      const y = place(rod, myPlayer);
      if (y < 0) return;

      const myLine = winningLine(boardRef.current, myPlayer);
      if (myLine) markWinning(myLine);
      const iWon = !!myLine;
      const drew = !iWon && isFull(boardRef.current);
      const serverWinner = iWon ? multiplayerState!.playerNumber : drew ? 0 : undefined;
      onMultiplayerMove?.({
        boardState: {
          board: [...boardRef.current],
          last: { x: rod.x, y, z: rod.z, player: myPlayer },
        },
        winner: serverWinner,
      });
      setTurn(otherPlayer);
      if (iWon || drew) {
        endedRef.current = true;
        setOver(true);
      }
      return;
    }

    if (turn !== 1) return;
    place(rod, 1);

    const myLine = winningLine(boardRef.current, 1);
    if (myLine) {
      markWinning(myLine);
      onMessage('Four in a row — you win!');
      finish('win');
      return;
    }
    if (isFull(boardRef.current)) { finish('draw'); return; }

    setTurn(2);
    onMessage('AI thinking...');
    schedule(() => {
      const aiRod = bestRod(boardRef.current, 2, difficulty);
      if (!aiRod) { finish('draw'); return; }
      place(aiRod, 2);
      const aiLine = winningLine(boardRef.current, 2);
      if (aiLine) {
        markWinning(aiLine);
        playCapture();
        onMessage('AI lined up four!');
        finish('lose');
        return;
      }
      if (isFull(boardRef.current)) { finish('draw'); return; }
      setTurn(1);
      onMessage('Your turn!');
    }, 450);
  }, [
    over, turn, difficulty, place, markWinning, finish, onMessage, schedule,
    isOnline, myPlayer, otherPlayer, multiplayerState, onMultiplayerMove,
  ]);

  // Drag anywhere = orbit; small movements still count as clicks on rods.
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    if (d.moved) {
      setView({
        yaw: d.yaw + dx * 0.008,
        pitch: Math.max(-0.15, Math.min(0.9, d.pitch + dy * 0.006)),
      });
    }
  };
  const onPointerUp = () => { dragRef.current = null; };

  // Keyboard: arrows move the rod cursor, Enter drops.
  const describeRod = (rod: Rod): string => {
    const free = landingY(boardRef.current, rod.x, rod.z);
    const spaces = free < 0 ? 0 : N - free;
    return `Rod ${rod.x + 1}, ${rod.z + 1}: ${spaces === 0 ? 'full' : `${spaces} space${spaces === 1 ? '' : 's'} left`}`;
  };
  const [announce, setAnnounce] = useState('');
  const onKeyDown = (e: React.KeyboardEvent) => {
    const cur = cursor ?? { x: 1, z: 1 };
    let next: Rod;
    switch (e.key) {
      case 'ArrowLeft': next = { ...cur, x: Math.max(0, cur.x - 1) }; break;
      case 'ArrowRight': next = { ...cur, x: Math.min(N - 1, cur.x + 1) }; break;
      case 'ArrowUp': next = { ...cur, z: Math.max(0, cur.z - 1) }; break;
      case 'ArrowDown': next = { ...cur, z: Math.min(N - 1, cur.z + 1) }; break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (cursor) handleDrop(cursor);
        else { setCursor(cur); setAnnounce(describeRod(cur)); }
        return;
      case 'Escape': setCursor(null); return;
      default: return;
    }
    e.preventDefault();
    setCursor(next);
    setAnnounce(describeRod(next));
  };

  const isMyTurn = isOnline ? turn === myPlayer : turn === 1;
  const oppLabel = isOnline
    ? `${multiplayerState?.opponentAvatar ?? ''} ${multiplayerState?.opponentName ?? 'Opponent'}`.trim()
    : 'AI';

  if (!supported) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-5xl" aria-hidden>🏗️</div>
        <h2 className="text-xl font-bold">Score Four needs 3D graphics</h2>
        <p className="text-text-muted text-sm max-w-xs">
          This game uses WebGL, which isn't available on this device or browser.
          Try Connect Four for the classic 2D version!
        </p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-6xl" aria-hidden>🏗️</div>
        <h2 className="text-2xl font-bold">Score Four</h2>
        <div className="bg-card rounded-xl p-4 max-w-xs w-full space-y-2 text-sm text-text-muted">
          <div className="flex items-start gap-2"><span>🟣</span><span>Drop beads onto any of the 16 rods — they stack upward</span></div>
          <div className="flex items-start gap-2"><span>📐</span><span>Line up 4 in ANY direction — flat, up a rod, or through space</span></div>
          <div className="flex items-start gap-2"><span>🔄</span><span>Drag to spin the board and spot diagonals · arrow keys + Enter work too</span></div>
        </div>
        <p className="text-xs text-text-muted">
          {isOnline
            ? `Online vs ${multiplayerState?.opponentName ?? 'opponent'} · Stage ${stage}`
            : <>AI difficulty: <span className="text-accent font-bold capitalize">{difficulty}</span> · Stage {stage}</>}
        </p>
        <button
          onClick={() => { setStarted(true); onMessage(isOnline ? (isMyTurn ? 'Your turn — tap a rod to drop!' : 'Waiting for opponent...') : 'Your turn — tap a rod to drop!'); }}
          className="bg-accent text-bg font-bold px-8 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 transition-all"
        >
          Start Game
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {isOnline ? (
        <div className="flex gap-2 justify-center py-2 text-xs items-center flex-wrap flex-shrink-0">
          <span className={`bg-card rounded-lg px-3 py-1.5 font-bold ${isMyTurn ? 'text-accent' : 'text-text-muted'}`}>
            You: {myPlayer === 1 ? '🟣' : '🟠'}
          </span>
          <span className="bg-card rounded-lg px-3 py-1.5 font-bold text-text-muted">
            {oppLabel}: {otherPlayer === 1 ? '🟣' : '🟠'}
          </span>
          <span className={`font-bold ${over ? 'text-text-muted' : isMyTurn ? 'text-success animate-pulse' : 'text-text-muted'}`}>
            {over ? 'Game over' : isMyTurn ? 'Your turn' : 'Waiting...'}
          </span>
        </div>
      ) : (
        <div className="flex gap-3 justify-center py-2 text-sm flex-shrink-0">
          <span className="bg-card rounded-lg px-3 py-1.5 font-bold" style={{ color: P1_COLOR }}>You: 🟣</span>
          <span className="bg-card rounded-lg px-3 py-1.5 font-bold" style={{ color: P2_COLOR }}>AI: 🟠</span>
          <span className={`bg-card rounded-lg px-3 py-1.5 text-xs font-bold ${turn === 1 && !over ? 'text-accent animate-pulse' : 'text-text-muted'}`}>
            {over ? 'Game over' : turn === 1 ? 'Your turn' : 'AI thinking…'}
          </span>
        </div>
      )}

      <div
        className="flex-1 min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl mx-2 mb-2"
        tabIndex={0}
        role="application"
        aria-roledescription="Score Four board"
        aria-label={`Score Four: 4 by 4 by 4 board. ${beads.length} beads placed. ${
          over ? 'Game over.'
          : isMyTurn ? 'Your turn. Arrow keys choose a rod, Enter drops a bead.'
          : isOnline ? 'Waiting for opponent.' : 'AI is thinking.'
        }`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onBlur={() => setCursor(null)}
      >
        <Canvas camera={{ position: [7.6, 7.2, 10.6], fov: 40 }} dpr={[1, 2]}>
          <Scene
            beads={beads}
            cursor={cursor}
            hover={hover}
            onRodClick={handleDrop}
            onRodHover={setHover}
            yaw={view.yaw}
            pitch={view.pitch}
          />
        </Canvas>
      </div>

      <span className="sr-only" role="status" aria-live="polite">{announce}</span>
      <p className="text-[10px] text-text-muted text-center pb-2 flex-shrink-0">
        Drag to spin · tap a rod to drop · 4 in a line wins (diagonals count!)
      </p>
    </div>
  );
}

export default ScoreFourGame;
