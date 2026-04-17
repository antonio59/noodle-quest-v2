import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '@/types';

/**
 * Full Ludo board — 15×15 grid with cross-shaped track.
 * 52 outer squares, 6 home-stretch squares per color, 1 center home.
 * Currently supports 2-player (Red vs Blue AI).
 */

const C = 24; // cell size
const N = 15;
const W = C * N;

// Full 52-square outer track (clockwise from Red entry)
const TRACK: [number, number][] = [
  // Red's start → across top of left arm (0-5)  [row, col]
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  // Up left side of top arm (5-11)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // Across top (12)
  [0, 7],
  // Down right side of top arm (13-18) — Green's side
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // Across top of right arm (19-24)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13],
  // Right-bottom turn (25)
  [7, 14],
  // Down right side (26-31) — Blue approach
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // Down right side of bottom arm (32-37)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // Bottom turn (38)
  [14, 7],
  // Up left side of bottom arm (39-44)
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  // Across bottom of left arm (45-50)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1],
  // Left turn back to red start (51)
  [7, 0],
];

// Red home stretch: enters from square 51 (left side), goes right toward center
const RED_STRETCH: [number, number][] = [
  [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],
];

// Blue home stretch: enters from square 25 (right side), goes left toward center
const BLUE_STRETCH: [number, number][] = [
  [7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8],
];

const DIFF_CFG = {
  easy: { enter: 0.3, home: 0.35, cap: 0.25 },
  medium: { enter: 0.7, home: 0.8, cap: 0.7 },
  hard: { enter: 1.0, home: 1.0, cap: 1.0 },
};

function rollDie(): number { return Math.floor(Math.random() * 6) + 1; }

function posCoord(pos: number, stretch: [number, number][]): [number, number] {
  if (pos < 0) return [-1, -1];
  if (pos < 52) return TRACK[pos];
  if (pos < 58) return stretch[pos - 52];
  return [7, 7]; // center home
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

// Board cell classification for coloring
function cellType(r: number, c: number): string | null {
  // Red home base (top-left)
  if (r >= 0 && r <= 5 && c >= 0 && c <= 5) return 'red-base';
  // Green home base (top-right)
  if (r >= 0 && r <= 5 && c >= 9 && c <= 14) return 'green-base';
  // Yellow home base (bottom-left)
  if (r >= 0 + 9 && r <= 14 && c >= 0 && c <= 5) return 'yellow-base';
  // Blue home base (bottom-right)
  if (r >= 9 && r <= 14 && c >= 9 && c <= 14) return 'blue-base';
  return null;
}

const MAX_LOSSES = 3;

function LudoGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps) {
  const [pPos, setPPos] = useState(-1);
  const [aPos, setAPos] = useState(-1);
  const [turn, setTurn] = useState<'p' | 'a'>('p');
  const [dice, setDice] = useState<number | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [over, setOver] = useState(false);
  const target = Math.max(1, Math.min(stage, 10));
  const diff = aiDifficulty || 'medium';

  // Blue AI enters at position 26 (its entry square) instead of 0
  const BLUE_ENTRY = 26;

  // Refs to avoid stale closures inside chained setTimeouts
  const pPosRef = useRef(-1);
  const aPosRef = useRef(-1);
  const winsRef = useRef(0);
  const lossesRef = useRef(0);
  const overRef = useRef(false);
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
    onMessage('Roll a 6 to enter the track!');
  }, [onMessage]);

  const finishMatch = useCallback((outcome: 'win' | 'lose') => {
    if (endedRef.current) return;
    endedRef.current = true;
    const fw = winsRef.current;
    const fl = lossesRef.current;
    const stars = outcome === 'win'
      ? (fl === 0 ? 3 : fl === 1 ? 2 : 1)
      : (fw > 0 ? 2 : 1);
    const summary = outcome === 'win'
      ? `Won ${fw} of ${fw + fl} games of Ludo!`
      : `AI won the match — ${fw} wins vs ${fl} losses.`;
    onEnd({ score: fw * 100, stars, summary });
  }, [onEnd]);

  const updatePPos = (v: number) => { pPosRef.current = v; setPPos(v); };
  const updateAPos = (v: number) => { aPosRef.current = v; setAPos(v); };
  const updateOver = (v: boolean) => { overRef.current = v; setOver(v); };

  const reset = useCallback(() => {
    if (endedRef.current) return;
    updatePPos(-1);
    updateAPos(-1);
    setTurn('p');
    setDice(null);
    updateOver(false);
    onMessage('New round! Roll a 6 to enter.');
  }, [onMessage]);

  const advanceAI = (pos: number, steps: number): number => {
    if (pos === -1) return steps === 6 ? BLUE_ENTRY : -1;
    const next = pos + steps;
    // AI enters home stretch at position 25 (before its entry)
    if (pos < 52 && next >= 52) {
      // Check if AI should enter its home stretch
      const overTrack = next - 52;
      if (overTrack <= 6) return 52 + overTrack; // into stretch
      return pos; // can't overshoot
    }
    if (pos >= 52) {
      const nextStretch = pos + steps;
      return nextStretch > 58 ? pos : nextStretch;
    }
    return next % 52; // wrap around track
  };

  const doAi = () => {
    if (endedRef.current || overRef.current) return;
    const curP = pPosRef.current;
    const curA = aPosRef.current;
    const d = aiRoll(curP, curA, diff);
    setDice(d);
    const np = advanceAI(curA, d);

    if (np === curA && curA !== -1) {
      onMessage(`AI rolled ${d} — can't move.`);
      setTurn('p');
      return;
    }
    if (np === -1) {
      onMessage(`AI rolled ${d} — needs a 6.`);
      setTurn('p');
      return;
    }

    updateAPos(np);

    // Capture check (only on main track)
    if (np >= 0 && np < 52 && np === curP) {
      updatePPos(-1);
      onMessage(`AI rolled ${d} — captured you!`);
    } else if (np >= 58) {
      updateOver(true);
      const newLosses = lossesRef.current + 1;
      lossesRef.current = newLosses;
      setLosses(newLosses);
      if (newLosses >= MAX_LOSSES) {
        onMessage('AI won the match!');
        schedule(() => finishMatch('lose'), 1500);
      } else {
        onMessage(`AI reached home — ${newLosses}/${MAX_LOSSES} losses.`);
        schedule(reset, 1500);
      }
      return;
    } else {
      const label = np >= 52 ? `home stretch ${np - 51}/6` : `square ${np}`;
      onMessage(`AI rolled ${d} → ${label}`);
    }

    if (d === 6 && !overRef.current) {
      onMessage('AI rolled 6 — bonus roll!');
      schedule(doAi, 700);
      return;
    }
    setTurn('p');
  };

  const handleRoll = () => {
    if (endedRef.current || overRef.current || turn !== 'p') return;
    const curP = pPosRef.current;
    const curA = aPosRef.current;
    const d = rollDie();
    setDice(d);
    const np = advance(curP, d);

    if (np === curP && curP !== -1) {
      onMessage(`Rolled ${d} — can't overshoot!`);
      setTurn('a');
      schedule(doAi, 800);
      return;
    }
    if (np === -1) {
      onMessage(`Rolled ${d} — need a 6!`);
      setTurn('a');
      schedule(doAi, 800);
      return;
    }

    updatePPos(np);

    if (np >= 0 && np < 52 && np === curA) {
      updateAPos(-1);
      onMessage(`Rolled ${d} — captured AI!`);
    } else if (np >= 58) {
      const w = winsRef.current + 1;
      winsRef.current = w;
      setWins(w);
      onScore(100);
      onProgress(w / target);
      if (w >= target) {
        updateOver(true);
        schedule(() => finishMatch('win'), 1000);
      } else {
        onMessage('You reached home!');
        schedule(reset, 1500);
      }
      return;
    } else {
      const label = np >= 52 ? `home stretch ${np - 51}/6` : `square ${np}`;
      onMessage(`Rolled ${d} → ${label}`);
    }

    if (d === 6 && !overRef.current) {
      onMessage('Rolled 6 — bonus roll!');
      return;
    }
    setTurn('a');
    schedule(doAi, 800);
  };

  const px = (col: number) => col * C;
  const cx = (col: number) => col * C + C / 2;
  const cy = (row: number) => row * C + C / 2;

  const renderBoard = () => {
    const el: React.ReactElement[] = [];

    // Background
    el.push(<rect key="bg" x={0} y={0} width={W} height={W} fill="#0f172a" rx={8} />);

    // Home bases — colored quadrants
    const bases = [
      { key: 'rb', x: 0, y: 0, color: '#ef4444', label: 'RED', labelX: 3, labelY: 3 },
      { key: 'gb', x: 9, y: 0, color: '#22c55e', label: 'GREEN', labelX: 12, labelY: 3 },
      { key: 'yb', x: 0, y: 9, color: '#eab308', label: 'YELLOW', labelX: 3, labelY: 12 },
      { key: 'bb', x: 9, y: 9, color: '#3b82f6', label: 'BLUE', labelX: 12, labelY: 12 },
    ];

    for (const b of bases) {
      el.push(
        <rect key={b.key} x={b.x * C + 2} y={b.y * C + 2} width={6 * C - 4} height={6 * C - 4}
          fill={b.color} fillOpacity={0.1} rx={8} stroke={b.color} strokeWidth={1} strokeOpacity={0.2} />,
        <rect key={`${b.key}i`} x={(b.x + 1) * C} y={(b.y + 1) * C} width={4 * C} height={4 * C}
          fill={b.color} fillOpacity={0.15} rx={6} stroke={b.color} strokeWidth={1.5} strokeOpacity={0.25} />,
        <text key={`${b.key}l`} x={cx(b.labelX)} y={cy(b.labelY)} textAnchor="middle" dominantBaseline="central"
          fontSize={8} fill={b.color} fontWeight="bold" opacity={0.5}>{b.label}</text>,
      );
    }

    // Cross arms background
    el.push(
      <rect key="arm-t" x={6 * C} y={0} width={3 * C} height={6 * C} fill="#1e293b" />,
      <rect key="arm-l" x={0} y={6 * C} width={6 * C} height={3 * C} fill="#1e293b" />,
      <rect key="arm-c" x={6 * C} y={6 * C} width={3 * C} height={3 * C} fill="#1e293b" />,
      <rect key="arm-r" x={9 * C} y={6 * C} width={6 * C} height={3 * C} fill="#1e293b" />,
      <rect key="arm-b" x={6 * C} y={9 * C} width={3 * C} height={6 * C} fill="#1e293b" />,
    );

    // Track squares
    TRACK.forEach(([row, col], i) => {
      const isRedEntry = i === 0;
      const isBlueEntry = i === BLUE_ENTRY;
      const isGreenEntry = i === 13;
      const isYellowEntry = i === 39;
      let fill = '#e2e8f0';
      if (isRedEntry) fill = '#fecaca';
      if (isBlueEntry) fill = '#bfdbfe';
      if (isGreenEntry) fill = '#bbf7d0';
      if (isYellowEntry) fill = '#fef08a';
      el.push(
        <rect key={`t${i}`} x={col * C + 0.5} y={row * C + 0.5} width={C - 1} height={C - 1}
          fill={fill} stroke="#94a3b8" strokeWidth={0.4} rx={2} />,
      );
    });

    // Home stretches
    const stretches = [
      { data: RED_STRETCH, color: '#ef4444', fillColor: '#fecaca', label: 'R' },
      { data: BLUE_STRETCH, color: '#3b82f6', fillColor: '#bfdbfe', label: 'B' },
    ];
    // Also show green/yellow stretch visually (not playable yet)
    const greenStretch: [number, number][] = [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]];
    const yellowStretch: [number, number][] = [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]];
    const decorativeStretches = [
      { data: greenStretch, color: '#22c55e', fillColor: '#bbf7d0' },
      { data: yellowStretch, color: '#eab308', fillColor: '#fef08a' },
    ];

    for (const s of [...stretches, ...decorativeStretches]) {
      s.data.forEach(([row, col], i) => {
        el.push(
          <rect key={`s-${s.color}-${i}`} x={col * C + 0.5} y={row * C + 0.5} width={C - 1} height={C - 1}
            fill={s.fillColor} stroke={s.color} strokeWidth={0.6} rx={2} />,
          <text key={`sl-${s.color}-${i}`} x={cx(col)} y={cy(row)} textAnchor="middle" dominantBaseline="central"
            fontSize={6} fill={s.color} fontWeight="bold">{i + 1}</text>,
        );
      });
    }

    // Center home triangle
    const centerX = cx(7), centerY = cy(7);
    el.push(
      <circle key="home-bg" cx={centerX} cy={centerY} r={C * 1.2} fill="#fbbf24" fillOpacity={0.12} />,
      <circle key="home-fg" cx={centerX} cy={centerY} r={C * 0.7} fill="#fbbf24" fillOpacity={0.2} stroke="#f59e0b" strokeWidth={1} />,
      <text key="home-star" x={centerX} y={centerY + 1} textAnchor="middle" dominantBaseline="central"
        fontSize={14} fill="#92400e" fontWeight="bold">{'\u2605'}</text>,
    );

    return el;
  };

  const renderTokens = () => {
    const el: React.ReactElement[] = [];
    const r = C * 0.4;

    // Player (red)
    if (pPos === -1) {
      el.push(
        <circle key="pt" cx={cx(2)} cy={cy(2)} r={r + 1} fill="#ef4444" stroke="white" strokeWidth={1.5} />,
        <text key="ptl" x={cx(2)} y={cy(2) + 1} textAnchor="middle" dominantBaseline="central" fontSize={8} fill="white" fontWeight="bold">P</text>,
      );
    } else {
      const [row, col] = posCoord(pPos, RED_STRETCH);
      el.push(
        <circle key="pt" cx={cx(col)} cy={cy(row)} r={r} fill="#ef4444" stroke="white" strokeWidth={1.5} />,
        <text key="ptl" x={cx(col)} y={cy(row) + 1} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="white" fontWeight="bold">P</text>,
      );
    }

    // AI (blue)
    if (aPos === -1) {
      el.push(
        <circle key="at" cx={cx(12)} cy={cy(12)} r={r + 1} fill="#3b82f6" stroke="white" strokeWidth={1.5} />,
        <text key="atl" x={cx(12)} y={cy(12) + 1} textAnchor="middle" dominantBaseline="central" fontSize={8} fill="white" fontWeight="bold">A</text>,
      );
    } else {
      const [row, col] = posCoord(aPos, BLUE_STRETCH);
      el.push(
        <circle key="at" cx={cx(col)} cy={cy(row)} r={r} fill="#3b82f6" stroke="white" strokeWidth={1.5} />,
        <text key="atl" x={cx(col)} y={cy(row) + 1} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="white" fontWeight="bold">A</text>,
      );
    }

    return el;
  };

  const posLabel = (pos: number) => {
    if (pos === -1) return 'Base';
    if (pos < 52) return `Track ${pos}`;
    if (pos < 58) return `Stretch ${pos - 51}/6`;
    return 'HOME';
  };

  return (
    <div className="h-full flex flex-col items-center p-2 gap-1.5">
      {/* Status bar */}
      <div className="flex gap-2 text-xs items-center flex-wrap justify-center">
        <span className="bg-card rounded-lg px-2 py-0.5 text-danger font-bold flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
          You: {posLabel(pPos)}
        </span>
        <span className="bg-card rounded-lg px-2 py-0.5 text-blue-400 font-bold flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
          AI: {posLabel(aPos)}
        </span>
        <span className="bg-card rounded-lg px-2 py-0.5 text-accent font-bold">{wins}/{target}</span>
        {losses > 0 && (
          <span className="bg-card rounded-lg px-2 py-0.5 text-danger">L: {losses}/{MAX_LOSSES}</span>
        )}
      </div>

      {/* Board */}
      <div className="w-full max-w-[380px] flex-shrink-0">
        <svg viewBox={`0 0 ${W} ${W}`} className="w-full h-auto rounded-xl" style={{ maxHeight: '58vh' }}>
          {renderBoard()}
          {renderTokens()}
        </svg>
      </div>

      {/* Dice + Roll */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-card rounded-xl flex items-center justify-center text-2xl font-bold select-none">
          {dice !== null ? (
            <span className={dice === 6 ? 'text-accent' : 'text-text'}>{dice}</span>
          ) : (
            <span>🎲</span>
          )}
        </div>
        <button
          onClick={handleRoll}
          disabled={over || turn !== 'p'}
          className="bg-accent text-bg font-bold px-5 py-2 rounded-xl text-sm hover:opacity-90 active:scale-95 disabled:opacity-30 transition-all"
        >
          {turn === 'p' ? 'Roll!' : 'AI thinking...'}
        </button>
      </div>

      <div className="text-[11px] text-text-muted text-center px-4 leading-relaxed">
        Roll 6 to enter. Land on opponent to capture. Reach the star to win!
      </div>
    </div>
  );
}

export default LudoGame;
