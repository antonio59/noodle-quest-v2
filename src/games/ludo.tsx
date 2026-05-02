import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';

const C = 26; // cell size px
const N = 15;
const W = C * N;

// Full 52-square outer track (clockwise from Red entry)
const TRACK: [number, number][] = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],
  [7,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],
  [7,0],
];

const RED_STRETCH: [number, number][] = [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]];
const BLUE_STRETCH: [number, number][] = [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]];
const GREEN_STRETCH: [number, number][] = [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]];
const YELLOW_STRETCH: [number, number][] = [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]];

// Safe squares on the main track (entry squares + star squares)
const SAFE_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const DIFF_CFG = {
  easy:   { enter: 0.3,  home: 0.35, cap: 0.25 },
  medium: { enter: 0.7,  home: 0.8,  cap: 0.7  },
  hard:   { enter: 1.0,  home: 1.0,  cap: 1.0  },
};

function rollDie(): number { return Math.floor(Math.random() * 6) + 1; }

function posCoord(pos: number, stretch: [number, number][]): [number, number] {
  if (pos < 0) return [-1, -1];
  if (pos < 52) return TRACK[pos];
  if (pos < 58) return stretch[pos - 52];
  return [7, 7];
}

function advance(pos: number, steps: number): number {
  if (pos === -1) return steps === 6 ? 0 : -1;
  const next = pos + steps;
  return next > 58 ? pos : next;
}

function aiRoll(pPos: number, aPos: number, diff: 'easy' | 'medium' | 'hard'): number {
  const cfg = DIFF_CFG[diff];
  if (aPos === -1 && Math.random() < cfg.enter) return 6;
  if (aPos >= 0 && Math.random() < cfg.home) {
    const gap = 58 - aPos;
    if (gap > 0 && gap <= 6) return gap;
  }
  if (aPos >= 0 && aPos < 52 && pPos >= 0 && pPos < 52 && Math.random() < cfg.cap) {
    const gap = ((pPos - aPos) + 52) % 52;
    if (gap > 0 && gap <= 6) return gap;
  }
  return rollDie();
}

function LudoGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty, multiplayerState, onMultiplayerMove }: GameProps) {
  const isOnline = !!multiplayerState;
  const mySide: 'red' | 'blue' = isOnline
    ? (multiplayerState.playerNumber === 1 ? 'red' : 'blue')
    : 'red';
  const oppSide: 'red' | 'blue' = mySide === 'red' ? 'blue' : 'red';
  const myStretch   = mySide === 'red' ? RED_STRETCH  : BLUE_STRETCH;
  const oppStretch  = mySide === 'red' ? BLUE_STRETCH : RED_STRETCH;
  const myColor     = mySide === 'red' ? '#ef4444' : '#3b82f6';
  const oppColor    = mySide === 'red' ? '#3b82f6' : '#ef4444';

  const [pPos, setPPos] = useState(-1);
  const [aPos, setAPos] = useState(-1);
  const [turn, setTurn] = useState<'p' | 'a'>('p');
  const [dice, setDice] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);
  const diff = aiDifficulty || 'medium';

  const BLUE_ENTRY = 26;

  const pPosRef  = useRef(-1);
  const aPosRef  = useRef(-1);
  const overRef  = useRef(false);
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

  useEffect(() => {
    onMessage(isOnline ? 'Online Ludo — roll a 6 to enter!' : 'Roll a 6 to enter the track!');
  }, [onMessage, isOnline]);

  useEffect(() => {
    if (!isOnline || !multiplayerState) return;
    const bs = multiplayerState.boardState as { redPos?: number; bluePos?: number; lastRoll?: number } | null | undefined;
    if (!bs) return;
    const redPos  = typeof bs.redPos  === 'number' ? bs.redPos  : -1;
    const bluePos = typeof bs.bluePos === 'number' ? bs.bluePos : -1;
    const myPos   = mySide === 'red' ? redPos  : bluePos;
    const oppPos  = mySide === 'red' ? bluePos : redPos;
    pPosRef.current = myPos;
    aPosRef.current = oppPos;
    setPPos(myPos);
    setAPos(oppPos);
    if (typeof bs.lastRoll === 'number') setDice(bs.lastRoll);
    setTurn(multiplayerState.currentPlayer === multiplayerState.playerNumber ? 'p' : 'a');
    if ((redPos >= 58 || bluePos >= 58) && !endedRef.current) {
      endedRef.current = true;
      const iWon = myPos >= 58;
      onEnd({ score: iWon ? 100 : 0, stars: iWon ? 3 : 1, summary: iWon ? 'You won online Ludo!' : 'Opponent reached home first.' });
    }
  }, [isOnline, multiplayerState, mySide, onEnd]);

  const updatePPos = (v: number) => { pPosRef.current = v; setPPos(v); };
  const updateAPos = (v: number) => { aPosRef.current = v; setAPos(v); };
  const updateOver = (v: boolean) => { overRef.current = v; setOver(v); };

  const advanceAI = (pos: number, steps: number): number => {
    if (pos === -1) return steps === 6 ? BLUE_ENTRY : -1;
    const next = pos + steps;
    if (pos < 52 && next >= 52) {
      const overTrack = next - 52;
      if (overTrack <= 6) return 52 + overTrack;
      return pos;
    }
    if (pos >= 52) {
      const nextStretch = pos + steps;
      return nextStretch > 58 ? pos : nextStretch;
    }
    return next % 52;
  };

  const doAi = () => {
    if (endedRef.current || overRef.current) return;
    const curP = pPosRef.current, curA = aPosRef.current;
    const d = aiRoll(curP, curA, diff);
    setDice(d);
    const np = advanceAI(curA, d);
    if (np === curA && curA !== -1) { onMessage(`AI rolled ${d} — can't move.`); setTurn('p'); return; }
    if (np === -1)                   { onMessage(`AI rolled ${d} — needs a 6.`); setTurn('p'); return; }
    updateAPos(np);
    if (np >= 0 && np < 52 && np === curP) {
      updatePPos(-1);
      onMessage(`AI rolled ${d} — captured you!`);
    } else if (np >= 58) {
      updateOver(true);
      onMessage('AI reached home! 💔');
      endedRef.current = true;
      schedule(() => onEnd({ score: 10, stars: 1, summary: 'The AI got home first. Better luck next time!' }), 1500);
      return;
    } else {
      const label = np >= 52 ? `home stretch ${np - 51}/6` : `square ${np}`;
      onMessage(`AI rolled ${d} → ${label}`);
    }
    if (d === 6 && !overRef.current) { onMessage('AI rolled 6 — bonus roll!'); schedule(doAi, 700); return; }
    setTurn('p');
  };

  const handleRoll = () => {
    if (endedRef.current || overRef.current || turn !== 'p') return;
    const curP = pPosRef.current, curA = aPosRef.current;
    const d = rollDie();
    setDice(d);

    if (isOnline && multiplayerState && onMultiplayerMove) {
      const myAdvance = mySide === 'red' ? advance : advanceAI;
      const np = myAdvance(curP, d);
      if (np === curP && curP !== -1) { onMessage(`Rolled ${d} — can't move.`); return; }
      if (np === -1)                   { onMessage(`Rolled ${d} — need a 6.`); return; }
      let newOpp = curA;
      if (np >= 0 && np < 52 && np === curA) { newOpp = -1; onMessage(`Rolled ${d} — captured opponent!`); }
      updatePPos(np);
      if (newOpp !== curA) updateAPos(newOpp);
      const redPos  = mySide === 'red' ? np : newOpp;
      const bluePos = mySide === 'red' ? newOpp : np;
      const iWon = np >= 58;
      onMultiplayerMove({ boardState: { redPos, bluePos, lastRoll: d }, winner: iWon ? multiplayerState.playerNumber : undefined });
      if (iWon) onScore(100);
      return;
    }

    const np = advance(curP, d);
    if (np === curP && curP !== -1) { onMessage(`Rolled ${d} — can't overshoot!`); setTurn('a'); schedule(doAi, 800); return; }
    if (np === -1)                   { onMessage(`Rolled ${d} — need a 6!`);        setTurn('a'); schedule(doAi, 800); return; }
    updatePPos(np);
    if (np >= 0 && np < 52 && np === curA) {
      updateAPos(-1);
      onMessage(`Rolled ${d} — captured AI!`);
    } else if (np >= 58) {
      updateOver(true);
      onMessage('You reached home! 🎉');
      onScore(100);
      onProgress(1);
      endedRef.current = true;
      schedule(() => onEnd({ score: 100, stars: 3, summary: 'You got your piece home first! Well done!' }), 1000);
      return;
    } else {
      const label = np >= 52 ? `home stretch ${np - 51}/6` : `square ${np}`;
      onMessage(`Rolled ${d} → ${label}`);
    }
    if (d === 6 && !overRef.current) { onMessage('Rolled 6 — bonus roll!'); return; }
    setTurn('a');
    schedule(doAi, 800);
  };

  // SVG helpers
  const cx = (col: number) => col * C + C / 2;
  const cy = (row: number) => row * C + C / 2;

  const renderBoard = () => {
    const el: React.ReactElement[] = [];

    // ── Outer board frame ─────────────────────────────────────────────────
    el.push(
      <rect key="frame" x={0} y={0} width={W} height={W} fill="#0a0818" rx={10} />,
      <rect key="bg" x={2} y={2} width={W - 4} height={W - 4} fill="#0e0c1f" rx={9} />,
    );

    // ── Home bases ────────────────────────────────────────────────────────
    const bases = [
      { key: 'rb', gx: 0, gy: 0,  color: '#ef4444', label: 'RED'    },
      { key: 'gb', gx: 9, gy: 0,  color: '#22c55e', label: 'GREEN'  },
      { key: 'yb', gx: 0, gy: 9,  color: '#eab308', label: 'YELLOW' },
      { key: 'bb', gx: 9, gy: 9,  color: '#3b82f6', label: 'BLUE'   },
    ];

    for (const b of bases) {
      const bpx = b.gx * C, bpy = b.gy * C;
      // Outer quadrant
      el.push(
        <rect key={`${b.key}o`}
          x={bpx + 3} y={bpy + 3} width={6*C - 6} height={6*C - 6}
          fill={b.color} fillOpacity={0.12} rx={10}
          stroke={b.color} strokeWidth={1.5} strokeOpacity={0.3} />,
      );
      // Inner platform
      el.push(
        <rect key={`${b.key}i`}
          x={(b.gx + 1)*C + 5} y={(b.gy + 1)*C + 5}
          width={4*C - 10} height={4*C - 10}
          fill={b.color} fillOpacity={0.18} rx={8}
          stroke={b.color} strokeWidth={1.5} strokeOpacity={0.4} />,
      );
      // 4 piece-parking circles
      const spots: [number, number][] = [
        [b.gx + 1.7, b.gy + 1.7],
        [b.gx + 3.3, b.gy + 1.7],
        [b.gx + 1.7, b.gy + 3.3],
        [b.gx + 3.3, b.gy + 3.3],
      ];
      for (let si = 0; si < spots.length; si++) {
        const [sc, sr] = spots[si];
        el.push(
          <circle key={`${b.key}sp${si}`}
            cx={cx(sc)} cy={cy(sr)} r={C * 0.33}
            fill="rgba(0,0,0,0.25)"
            stroke={b.color} strokeWidth={1.5} strokeOpacity={0.5} />,
        );
      }
      // Label
      el.push(
        <text key={`${b.key}l`}
          x={cx(b.gx + 2.5)} y={cy(b.gy + 4.7)}
          textAnchor="middle" dominantBaseline="central"
          fontSize={8} fill={b.color} fontWeight="bold" opacity={0.55}>
          {b.label}
        </text>,
      );
    }

    // ── Cross arms ────────────────────────────────────────────────────────
    el.push(
      <rect key="arm-t" x={6*C} y={0}    width={3*C} height={6*C} fill="#111827" />,
      <rect key="arm-l" x={0}   y={6*C}  width={6*C} height={3*C} fill="#111827" />,
      <rect key="arm-c" x={6*C} y={6*C}  width={3*C} height={3*C} fill="#111827" />,
      <rect key="arm-r" x={9*C} y={6*C}  width={6*C} height={3*C} fill="#111827" />,
      <rect key="arm-b" x={6*C} y={9*C}  width={3*C} height={6*C} fill="#111827" />,
    );

    // ── Track squares ─────────────────────────────────────────────────────
    TRACK.forEach(([row, col], i) => {
      const isSafe  = SAFE_POSITIONS.has(i);
      const isRedEntry  = i === 0;
      const isBlueEntry = i === BLUE_ENTRY;
      const isGreenEntry = i === 13;
      const isYellowEntry = i === 39;

      let fill = '#182038';
      let stroke = '#2a3a5a';
      if (isRedEntry)    { fill = 'rgba(239,68,68,0.28)';   stroke = '#ef4444'; }
      if (isBlueEntry)   { fill = 'rgba(59,130,246,0.28)';  stroke = '#3b82f6'; }
      if (isGreenEntry)  { fill = 'rgba(34,197,94,0.28)';   stroke = '#22c55e'; }
      if (isYellowEntry) { fill = 'rgba(234,179,8,0.28)';   stroke = '#eab308'; }

      el.push(
        <rect key={`t${i}`}
          x={col*C + 1} y={row*C + 1} width={C - 2} height={C - 2}
          fill={fill} stroke={stroke} strokeWidth={isSafe ? 0.8 : 0.5} rx={3} />,
      );

      // Star on safe squares (non-entry)
      if (isSafe && !isRedEntry && !isBlueEntry && !isGreenEntry && !isYellowEntry) {
        el.push(
          <text key={`safe${i}`}
            x={cx(col)} y={cy(row)} textAnchor="middle" dominantBaseline="central"
            fontSize={9} fill="rgba(255,255,255,0.35)" style={{ userSelect: 'none' }}>
            ✦
          </text>,
        );
      }
    });

    // ── Home stretch lanes ────────────────────────────────────────────────
    const stretchDefs = [
      { data: RED_STRETCH,    color: '#ef4444', fillOpacity: 0.22 },
      { data: BLUE_STRETCH,   color: '#3b82f6', fillOpacity: 0.22 },
      { data: GREEN_STRETCH,  color: '#22c55e', fillOpacity: 0.18 },
      { data: YELLOW_STRETCH, color: '#eab308', fillOpacity: 0.18 },
    ];
    for (const s of stretchDefs) {
      s.data.forEach(([row, col], i) => {
        el.push(
          <rect key={`sr-${s.color}-${i}`}
            x={col*C + 1} y={row*C + 1} width={C - 2} height={C - 2}
            fill={s.color} fillOpacity={s.fillOpacity}
            stroke={s.color} strokeWidth={0.8} rx={3} />,
          <text key={`sn-${s.color}-${i}`}
            x={cx(col)} y={cy(row)} textAnchor="middle" dominantBaseline="central"
            fontSize={7} fill={s.color} fillOpacity={0.7} fontWeight="bold">
            {i + 1}
          </text>,
        );
      });
    }

    // ── Center home ────────────────────────────────────────────────────────
    const mx = 6*C, my = 6*C, ms = 3*C;
    const hcx = mx + ms / 2, hcy = my + ms / 2;
    // 4 colored triangles
    const tris = [
      { color: '#ef4444', pts: `${mx},${my} ${mx+ms},${my} ${hcx},${hcy}` },         // top → red
      { color: '#22c55e', pts: `${mx+ms},${my} ${mx+ms},${my+ms} ${hcx},${hcy}` },   // right → green
      { color: '#3b82f6', pts: `${mx},${my+ms} ${mx+ms},${my+ms} ${hcx},${hcy}` },   // bottom → blue
      { color: '#eab308', pts: `${mx},${my} ${mx},${my+ms} ${hcx},${hcy}` },         // left → yellow
    ];
    for (const t of tris) {
      el.push(<polygon key={`tri-${t.color}`} points={t.pts} fill={t.color} fillOpacity={0.25} />);
    }
    // Center circle
    el.push(
      <circle key="home-ring" cx={hcx} cy={hcy} r={C * 0.95}
        fill="#0e0c1f" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />,
      <circle key="home-inner" cx={hcx} cy={hcy} r={C * 0.7}
        fill="rgba(251,191,36,0.12)" stroke="#f59e0b" strokeWidth={1.2} />,
      <text key="home-star" x={hcx} y={hcy + 1} textAnchor="middle" dominantBaseline="central"
        fontSize={16} fill="#fbbf24">★</text>,
    );

    return el;
  };

  const renderTokens = () => {
    const el: React.ReactElement[] = [];
    const r = C * 0.42;
    const pColor  = isOnline ? myColor  : '#ef4444';
    const aColor  = isOnline ? oppColor : '#3b82f6';
    const pLight  = isOnline ? (mySide === 'red' ? '#fca5a5' : '#93c5fd') : '#fca5a5';
    const aLight  = isOnline ? (mySide === 'red' ? '#93c5fd' : '#fca5a5') : '#93c5fd';
    const pStretch = isOnline ? myStretch  : RED_STRETCH;
    const aStretch = isOnline ? oppStretch : BLUE_STRETCH;

    // Base positions for tokens not yet on track
    const pBaseC = mySide === 'red' ? 2.5 : 12.5;
    const pBaseR = mySide === 'red' ? 2.5 : 12.5;
    const aBaseC = mySide === 'red' ? 12.5 : 2.5;
    const aBaseR = mySide === 'red' ? 12.5 : 2.5;

    const drawToken = (id: string, tx: number, ty: number, color: string, light: string, label: string, isActive: boolean) => {
      return [
        // Drop shadow
        <circle key={`${id}-sh`} cx={tx + 1.5} cy={ty + 2.5} r={r + 1}
          fill="rgba(0,0,0,0.5)" />,
        // Glow ring when active
        ...(isActive ? [
          <circle key={`${id}-glow`} cx={tx} cy={ty} r={r + 4}
            fill="none" stroke={color} strokeWidth={2} opacity={0.5} />,
        ] : []),
        // Main body
        <circle key={`${id}-body`} cx={tx} cy={ty} r={r}
          fill={color} stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} />,
        // Top-left highlight
        <circle key={`${id}-hl`} cx={tx - r * 0.28} cy={ty - r * 0.3} r={r * 0.42}
          fill={light} opacity={0.45} />,
        // Letter
        <text key={`${id}-txt`} x={tx} y={ty + 1} textAnchor="middle" dominantBaseline="central"
          fontSize={r * 0.85} fill="white" fontWeight="bold">{label}</text>,
      ];
    };

    // Player token
    if (pPos === -1) {
      el.push(...drawToken('p', cx(pBaseC), cy(pBaseR), pColor, pLight, 'P', turn === 'p'));
    } else {
      const [row, col] = posCoord(pPos, pStretch);
      el.push(...drawToken('p', cx(col), cy(row), pColor, pLight, 'P', turn === 'p'));
    }

    // AI / opponent token
    if (aPos === -1) {
      el.push(...drawToken('a', cx(aBaseC), cy(aBaseR), aColor, aLight, isOnline ? 'O' : 'A', turn === 'a'));
    } else {
      const [row, col] = posCoord(aPos, aStretch);
      el.push(...drawToken('a', cx(col), cy(row), aColor, aLight, isOnline ? 'O' : 'A', turn === 'a'));
    }

    return el;
  };

  const posLabel = (pos: number) => {
    if (pos === -1) return 'Base';
    if (pos < 52) return `Track ${pos}`;
    if (pos < 58) return `Stretch ${pos - 51}/6`;
    return '🏠 HOME';
  };

  if (!started) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-6xl select-none">🎲</div>
        <div>
          <h2 className="text-2xl font-bold mb-1">Ludo</h2>
          <p className="text-text-muted text-sm max-w-xs">
            Race your piece from base to the golden star home. Roll a 6 to enter the track!
          </p>
        </div>
        {/* Rules card */}
        <div className="bg-card rounded-xl p-4 text-left max-w-xs w-full text-xs space-y-2 text-text-muted">
          {[
            ['🎲', 'Roll a 6 to leave base and enter the track'],
            ['✦', 'Star squares are safe — you can\'t be captured there'],
            ['💥', 'Land on opponent to send them back to base'],
            ['🎁', 'Roll a 6 again for a bonus turn'],
            ['🏠', 'Reach the star in the center to win!'],
          ].map(([icon, rule], i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 text-center">{icon}</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setStarted(true)}
          className="bg-accent text-bg font-bold px-10 py-3 rounded-xl text-lg hover:opacity-90 active:scale-95 transition-all"
        >
          Start Game
        </button>
      </div>
    );
  }

  const pPct = pPos < 0 ? 0 : pPos >= 58 ? 100 : Math.round((pPos / 58) * 100);
  const aPct = aPos < 0 ? 0 : aPos >= 58 ? 100 : Math.round((aPos / 58) * 100);

  return (
    <div className="h-full flex flex-col items-center p-2 gap-2">
      {/* Status bar */}
      <div className="w-full max-w-[400px] flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: isOnline ? myColor : '#ef4444' }} />
          <span className="text-xs font-bold" style={{ color: isOnline ? myColor : '#ef4444' }}>You</span>
          <span className="text-[11px] text-text-muted">{posLabel(pPos)}</span>
        </div>
        {/* Turn pill */}
        <div className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-all ${
          turn === 'p'
            ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
            : 'bg-card text-text-muted'
        }`}>
          {turn === 'p' ? (
            <><span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span> Your turn</>
          ) : (
            <><span className="animate-pulse">🤖</span> {isOnline ? 'Their turn' : 'AI rolling…'}</>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-text-muted">{posLabel(aPos)}</span>
          <span className="text-xs font-bold" style={{ color: isOnline ? oppColor : '#3b82f6' }}>{isOnline ? (multiplayerState?.opponentName || 'Opp') : 'AI'}</span>
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: isOnline ? oppColor : '#3b82f6' }} />
        </div>
      </div>

      {/* Board */}
      <div className="flex-shrink-0 w-full flex justify-center">
        <svg viewBox={`0 0 ${W} ${W}`} className="rounded-xl w-full h-auto shadow-2xl"
          style={{ maxWidth: 390, maxHeight: '55vh' }}>
          {renderBoard()}
          {renderTokens()}
        </svg>
      </div>

      {/* Dice + Roll button */}
      <div className="flex items-center gap-3">
        <DiceFace value={dice} highlight={dice === 6} />
        <button
          onClick={handleRoll}
          disabled={over || turn !== 'p'}
          className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl text-sm hover:opacity-90 active:scale-95 disabled:opacity-30 transition-all shadow-lg shadow-accent/25"
        >
          {turn === 'p' ? 'Roll!' : isOnline ? "Opponent's turn" : 'AI thinking\u2026'}
        </button>
      </div>

      {/* Progress bars */}
      {!isOnline && (
        <div className="w-full max-w-[400px] flex flex-col gap-1.5 px-1">
          {[
            { label: 'You', pct: pPct, color: '#ef4444', pos: pPos },
            { label: 'AI',  pct: aPct, color: '#3b82f6', pos: aPos },
          ].map(bar => (
            <div key={bar.label} className="flex items-center gap-2 text-xs">
              <span className="font-bold w-5 text-right" style={{ color: bar.color }}>{bar.label}</span>
              <div className="flex-1 h-2 bg-card rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${bar.pct}%`, background: bar.color }} />
              </div>
              <span className="text-text-muted w-10 text-right font-medium">
                {bar.pos < 0 ? 'Base' : bar.pos >= 58 ? '🏠' : `${bar.pct}%`}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-text-muted text-center">
        Roll 6 to enter · Land on opponent to capture · Reach ★ to win
      </p>
    </div>
  );
}

function DiceFace({ value, highlight }: { value: number | null; highlight?: boolean }) {
  const pipLayouts: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
  };
  const pips = value !== null ? (pipLayouts[value] || []) : [];
  return (
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center select-none border-2 transition-all shadow-md ${
      highlight
        ? 'bg-accent/20 border-accent shadow-accent/30'
        : 'bg-card border-white/10'
    }`}>
      {value === null ? (
        <span className="text-3xl">🎲</span>
      ) : (
        <svg width="44" height="44" viewBox="0 0 100 100">
          <rect x={2} y={2} width={96} height={96} rx={14}
            fill={highlight ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.04)'} />
          {pips.map(([px, py], i) => (
            <circle key={i} cx={px} cy={py} r={10}
              fill={highlight ? '#a78bfa' : '#cbd5e1'} />
          ))}
        </svg>
      )}
    </div>
  );
}

export default LudoGame;
