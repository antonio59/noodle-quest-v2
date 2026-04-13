import { useState, useEffect } from 'react';
import type { GameProps } from '@/types';
import { registerGame } from '@/lib/game-registry';

const C = 28;
const N = 15;
const W = C * N;

const TRACK: [number, number][] = [
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13],
];

const STRETCH: [number, number][] = [
  [7, 13], [7, 12], [7, 11], [7, 10], [7, 9],
];

const DIFF_CFG = {
  easy: { enter: 0.3, home: 0.35, cap: 0.25 },
  medium: { enter: 0.7, home: 0.8, cap: 0.7 },
  hard: { enter: 1.0, home: 1.0, cap: 1.0 },
};

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function posCoord(pos: number): [number, number] {
  if (pos < 0) return [-1, -1];
  if (pos < 28) return TRACK[pos];
  if (pos < 33) return STRETCH[pos - 28];
  return [7, 7];
}

function advance(pos: number, steps: number): number {
  if (pos === -1) return steps === 6 ? 0 : -1;
  const next = pos + steps;
  return next > 33 ? pos : next;
}

function aiRoll(pPos: number, aPos: number, diff: 'easy' | 'medium' | 'hard'): number {
  const cfg = DIFF_CFG[diff];
  if (aPos === -1 && Math.random() < cfg.enter) return 6;
  if (aPos >= 0 && Math.random() < cfg.home) {
    const gap = 33 - aPos;
    if (gap > 0 && gap <= 6) return gap;
  }
  if (aPos >= 0 && aPos < 28 && pPos >= 0 && pPos < 28 && Math.random() < cfg.cap) {
    const gap = pPos - aPos;
    if (gap > 0 && gap <= 6) return gap;
  }
  return rollDie();
}

function LudoGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps) {
  const [pPos, setPPos] = useState(-1);
  const [aPos, setAPos] = useState(-1);
  const [turn, setTurn] = useState<'p' | 'a'>('p');
  const [dice, setDice] = useState<number | null>(null);
  const [wins, setWins] = useState(0);
  const [over, setOver] = useState(false);
  const target = Math.min(stage, 10);
  const diff = aiDifficulty || 'medium';

  useEffect(() => {
    onMessage('Roll a 6 to enter the track!');
  }, []);

  const reset = () => {
    setPPos(-1);
    setAPos(-1);
    setTurn('p');
    setDice(null);
    setOver(false);
    onMessage('New round! Roll a 6 to enter.');
  };

  const doAi = () => {
    if (over) return;
    const d = aiRoll(pPos, aPos, diff);
    setDice(d);
    const np = advance(aPos, d);

    if (np === aPos && aPos !== -1) {
      onMessage(`AI rolled ${d} — can't move.`);
      setTurn('p');
      return;
    }
    if (np === -1) {
      onMessage(`AI rolled ${d} — needs a 6 to enter.`);
      setTurn('p');
      return;
    }

    setAPos(np);

    if (np >= 0 && np < 28 && np === pPos) {
      setPPos(-1);
      onMessage(`AI rolled ${d} — captured you! Back to base!`);
    } else if (np >= 33) {
      setOver(true);
      onMessage('AI reached home — you lose this round!');
      setTimeout(reset, 1500);
      return;
    } else {
      const label = np >= 28 ? `home stretch ${np - 27}/5` : `square ${np}`;
      onMessage(`AI rolled ${d} — moved to ${label}`);
    }

    if (d === 6 && !over) {
      onMessage('AI rolled a 6 — bonus roll!');
      setTimeout(doAi, 700);
      return;
    }
    setTurn('p');
  };

  const handleRoll = () => {
    if (over || turn !== 'p') return;
    const d = rollDie();
    setDice(d);
    const np = advance(pPos, d);

    if (np === pPos && pPos !== -1) {
      onMessage(`Rolled ${d} — can't overshoot home!`);
      setTurn('a');
      setTimeout(doAi, 800);
      return;
    }
    if (np === -1) {
      onMessage(`Rolled ${d} — need a 6 to enter the track!`);
      setTurn('a');
      setTimeout(doAi, 800);
      return;
    }

    setPPos(np);

    if (np >= 0 && np < 28 && np === aPos) {
      setAPos(-1);
      onMessage(`Rolled ${d} — captured AI! Sent back to base!`);
    } else if (np >= 33) {
      const w = wins + 1;
      setWins(w);
      onScore(100);
      onProgress(w / target);
      if (w >= target) {
        setOver(true);
        onEnd({ score: w * 100, stars: 3, summary: `Won ${w} games of Ludo!` });
      } else {
        onMessage('You reached home! New round starting...');
        setTimeout(reset, 1500);
      }
      return;
    } else {
      const label = np >= 28 ? `home stretch ${np - 27}/5` : `square ${np}`;
      onMessage(`Rolled ${d} — moved to ${label}`);
    }

    if (d === 6 && !over) {
      onMessage('Rolled a 6 — bonus roll!');
      return;
    }
    setTurn('a');
    setTimeout(doAi, 800);
  };

  const cx = (col: number) => col * C + C / 2;
  const cy = (row: number) => row * C + C / 2;

  const renderBoard = () => {
    const el: React.ReactElement[] = [];

    el.push(
      <rect key="xt" x={6 * C} y={0} width={3 * C} height={6 * C} fill="#1e293b" rx={4} />,
      <rect key="xl" x={0} y={6 * C} width={6 * C} height={3 * C} fill="#1e293b" rx={4} />,
      <rect key="xc" x={6 * C} y={6 * C} width={3 * C} height={3 * C} fill="#1e293b" />,
      <rect key="xr" x={9 * C} y={6 * C} width={6 * C} height={3 * C} fill="#1e293b" rx={4} />,
      <rect key="xb" x={6 * C} y={9 * C} width={3 * C} height={6 * C} fill="#1e293b" rx={4} />,
    );

    el.push(
      <rect key="rb" x={2} y={2} width={6 * C - 4} height={6 * C - 4} fill="#ef4444" fillOpacity={0.12} rx={10} />,
      <rect key="rbi" x={C} y={C} width={4 * C} height={4 * C} fill="#ef4444" fillOpacity={0.18} rx={8} stroke="#ef4444" strokeWidth={1.5} strokeOpacity={0.3} />,
      <circle key="rbc" cx={cx(3)} cy={cy(3)} r={C * 0.7} fill="#ef4444" fillOpacity={0.1} stroke="#ef4444" strokeWidth={1} strokeOpacity={0.2} />,
      <text key="rbl" x={cx(3)} y={cy(3)} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#ef4444" fontWeight="bold" opacity={0.7}>RED</text>,
    );

    el.push(
      <rect key="gb" x={9 * C + 2} y={2} width={6 * C - 4} height={6 * C - 4} fill="#22c55e" fillOpacity={0.08} rx={10} />,
      <rect key="gbi" x={10 * C} y={C} width={4 * C} height={4 * C} fill="#22c55e" fillOpacity={0.12} rx={8} stroke="#22c55e" strokeWidth={1.5} strokeOpacity={0.2} />,
      <text key="gbl" x={cx(12)} y={cy(3)} textAnchor="middle" dominantBaseline="central" fontSize={8} fill="#22c55e" opacity={0.4}>HOME</text>,
    );

    el.push(
      <rect key="yb" x={2} y={9 * C + 2} width={6 * C - 4} height={6 * C - 4} fill="#eab308" fillOpacity={0.08} rx={10} />,
      <rect key="ybi" x={C} y={10 * C} width={4 * C} height={4 * C} fill="#eab308" fillOpacity={0.12} rx={8} stroke="#eab308" strokeWidth={1.5} strokeOpacity={0.2} />,
      <text key="ybl" x={cx(3)} y={cy(12)} textAnchor="middle" dominantBaseline="central" fontSize={8} fill="#eab308" opacity={0.4}>HOME</text>,
    );

    el.push(
      <rect key="bb" x={9 * C + 2} y={9 * C + 2} width={6 * C - 4} height={6 * C - 4} fill="#3b82f6" fillOpacity={0.12} rx={10} />,
      <rect key="bbi" x={10 * C} y={10 * C} width={4 * C} height={4 * C} fill="#3b82f6" fillOpacity={0.18} rx={8} stroke="#3b82f6" strokeWidth={1.5} strokeOpacity={0.3} />,
      <circle key="bbc" cx={cx(12)} cy={cy(12)} r={C * 0.7} fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" strokeWidth={1} strokeOpacity={0.2} />,
      <text key="bbl" x={cx(12)} y={cy(12)} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#3b82f6" fontWeight="bold" opacity={0.7}>BLUE</text>,
    );

    TRACK.forEach(([col, row], i) => {
      const isRedEntry = i === 0;
      const isBlueEntry = i === 14;
      let fill = '#f1f5f9';
      if (isRedEntry) fill = '#fecaca';
      if (isBlueEntry) fill = '#bfdbfe';
      el.push(
        <rect key={`t${i}`} x={col * C + 1} y={row * C + 1} width={C - 2} height={C - 2} fill={fill} stroke="#94a3b8" strokeWidth={0.5} rx={3} />,
      );
      el.push(
        <text key={`tl${i}`} x={cx(col)} y={cy(row) + 1} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="#475569" fontWeight={isRedEntry || isBlueEntry ? 'bold' : 'normal'}>
          {isRedEntry ? 'S' : isBlueEntry ? 'B' : i}
        </text>,
      );
    });

    STRETCH.forEach(([col, row], i) => {
      el.push(
        <rect key={`s${i}`} x={col * C + 1} y={row * C + 1} width={C - 2} height={C - 2} fill="#dcfce7" stroke="#22c55e" strokeWidth={0.75} rx={3} />,
      );
      el.push(
        <text key={`sl${i}`} x={cx(col)} y={cy(row) + 1} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="#16a34a" fontWeight="bold">
          {i + 1}
        </text>,
      );
    });

    el.push(
      <circle key="hbg" cx={cx(7)} cy={cy(7)} r={C * 1.1} fill="#fbbf24" fillOpacity={0.15} />,
      <circle key="hfg" cx={cx(7)} cy={cy(7)} r={C * 0.7} fill="#fbbf24" fillOpacity={0.25} stroke="#f59e0b" strokeWidth={1} />,
      <text key="hl" x={cx(7)} y={cy(7) + 1} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#92400e" fontWeight="bold">
        {'\u2605'}
      </text>,
    );

    return el;
  };

  const renderTokens = () => {
    const el: React.ReactElement[] = [];
    const r = C * 0.35;

    if (pPos === -1) {
      el.push(
        <circle key="pt" cx={cx(3)} cy={cy(3)} r={r + 2} fill="#ef4444" stroke="white" strokeWidth={2} filter="url(#shadow)" />,
        <text key="ptl" x={cx(3)} y={cy(3) + 1} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="white" fontWeight="bold">P</text>,
      );
    } else {
      const [col, row] = posCoord(pPos);
      const sameCell = aPos === pPos && pPos >= 28;
      el.push(
        <circle key="pt" cx={cx(col) + (sameCell ? -5 : 0)} cy={cy(row)} r={r} fill="#ef4444" stroke="white" strokeWidth={2} filter="url(#shadow)" />,
      );
    }

    if (aPos === -1) {
      el.push(
        <circle key="at" cx={cx(12)} cy={cy(12)} r={r + 2} fill="#3b82f6" stroke="white" strokeWidth={2} filter="url(#shadow)" />,
        <text key="atl" x={cx(12)} y={cy(12) + 1} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="white" fontWeight="bold">A</text>,
      );
    } else {
      const [col, row] = posCoord(aPos);
      const sameCell = aPos === pPos && pPos >= 28;
      el.push(
        <circle key="at" cx={cx(col) + (sameCell ? 5 : 0)} cy={cy(row)} r={r} fill="#3b82f6" stroke="white" strokeWidth={2} filter="url(#shadow)" />,
      );
    }

    return el;
  };

  const posLabel = (pos: number) => {
    if (pos === -1) return 'Base';
    if (pos < 28) return `Track ${pos}`;
    if (pos < 33) return `Stretch ${pos - 27}/5`;
    return 'HOME';
  };

  return (
    <div className="h-full flex flex-col items-center p-2 gap-2">
      <div className="flex gap-2 text-xs items-center flex-wrap justify-center">
        <span className="bg-card rounded-lg px-2.5 py-1 text-danger font-bold flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-[#ef4444]" />
          You: {posLabel(pPos)}
        </span>
        <span className="bg-card rounded-lg px-2.5 py-1 text-blue-400 font-bold flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-[#3b82f6]" />
          AI: {posLabel(aPos)}
        </span>
        <span className="bg-card rounded-lg px-2.5 py-1 text-accent font-bold">
          {wins}/{target}
        </span>
      </div>

      <div className="w-full max-w-[420px] flex-shrink-0">
        <svg viewBox={`0 0 ${W} ${W}`} className="w-full h-auto rounded-xl" style={{ maxHeight: '60vh' }}>
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx={0} dy={1} stdDeviation={1.5} floodColor="#000" floodOpacity={0.3} />
            </filter>
          </defs>
          <rect x={0} y={0} width={W} height={W} fill="#0f172a" rx={12} />
          {renderBoard()}
          {renderTokens()}
        </svg>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-card rounded-xl flex items-center justify-center text-3xl font-bold select-none">
          {dice !== null ? (
            <span className={dice === 6 ? 'text-accent' : 'text-text'}>{dice}</span>
          ) : (
            <span>{'\uD83C\uDFB2'}</span>
          )}
        </div>
        <button
          onClick={handleRoll}
          disabled={over || turn !== 'p'}
          className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl text-base hover:opacity-90 active:scale-95 disabled:opacity-30 transition-all"
        >
          {turn === 'p' ? 'Roll!' : 'AI...'}
        </button>
      </div>

      <div className="text-xs text-text-muted text-center px-4 leading-relaxed">
        Roll 6 to enter the track. Land on opponent to send them back. Reach the star to win!
      </div>
    </div>
  );
}

registerGame('ludo', {
  name: 'Ludo',
  emoji: '🎲',
  description: 'Roll the dice and race your token home!',
  category: 'board',
  stages: 10,
  component: LudoGame,
  aiDifficulty: 'medium',
});

export default LudoGame;
