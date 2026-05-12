import { useState, useRef, useCallback } from 'react';

const C = 26;
const N = 15;
const W = C * N;

const TRACK: [number, number][] = [[6,1],[6,2],[6,3],[6,4],[6,5]];
const RED_STRETCH: [number, number][] = [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]];
const BLUE_STRETCH: [number, number][] = [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]];
const GREEN_STRETCH: [number, number][] = [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]];
const YELLOW_STRETCH: [number, number][] = [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]];
const RED_SPOTS: [number, number][] = [[1.7,1.7],[3.3,1.7],[1.7,3.3],[3.3,3.3]];
const BLUE_SPOTS: [number, number][] = [[10.7,10.7],[12.3,10.7],[10.7,12.3],[12.3,12.3]];
const SAFE_POSITIONS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const BLUE_ENTRY = 26;
const STACK_OFF: [number, number][] = [[-4,-4],[4,-4],[-4,4],[4,4]];

function rollDie(): number { return Math.floor(Math.random() * 6) + 1; }

function posCoord(pos: number, stretch: [number, number][]): [number, number] {
  if (pos < 0) return [-1, -1];
  if (pos < 52) return TRACK[pos];
  if (pos < 58) return stretch[pos - 52];
  return [7, 7];
}

function advanceRed(pos: number, steps: number): number {
  if (pos === -1) return steps === 6 ? 0 : -1;
  const next = pos + steps;
  return next > 58 ? pos : next;
}

function advanceBlue(pos: number, steps: number): number {
  if (pos === -1) return steps === 6 ? BLUE_ENTRY : -1;
  const next = pos + steps;
  if (pos < 52 && next >= 52) {
    const over = next - 52;
    return over <= 6 ? 52 + over : pos;
  }
  if (pos >= 52) return next > 58 ? pos : next;
  return next % 52;
}

function getMovableIndices(pieces: number[], d: number, isBlue: boolean): number[] {
  const adv = isBlue ? advanceBlue : advanceRed;
  const result: number[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const pos = pieces[i];
    if (pos >= 58) continue;
    const np = adv(pos, d);
    if (np === pos) continue;
    if (np === -1) continue;
    result.push(i);
  }
  return result;
}

function scoreMove(np: number, pPieces: number[]): number {
  if (np >= 58) return 1000;
  let score = np >= 52 ? 200 + np : np;
  for (const pp of pPieces) {
    if (np === pp && np >= 0 && np < 52 && !SAFE_POSITIONS.has(np)) score += 500;
  }
  return score;
}

interface GameProps {
  stage: string;
  onScore: (n: number) => void;
  onProgress: (n: number) => void;
  onMessage: (s: string) => void;
  onEnd: (o: Record<string, unknown>) => void;
  multiplayerState?: { playerNumber: number };
  onMultiplayerMove?: (d: unknown) => void;
}

function LudoGame({ stage, onScore, onProgress, onMessage, onEnd, multiplayerState, onMultiplayerMove }: GameProps) {
  const isOnline = !!multiplayerState;
  const mySide: 'red' | 'blue' = isOnline
    ? (multiplayerState.playerNumber === 1 ? 'red' : 'blue')
    : 'red';
  const myStretch  = mySide === 'red' ? RED_STRETCH  : BLUE_STRETCH;
  const oppStretch = mySide === 'red' ? BLUE_STRETCH : RED_STRETCH;
  const myColor    = mySide === 'red' ? '#ef4444' : '#3b82f6';
  const oppColor   = mySide === 'red' ? '#3b82f6' : '#ef4444';
  const mySpots    = mySide === 'red' ? RED_SPOTS  : BLUE_SPOTS;
  const oppSpots   = mySide === 'red' ? BLUE_SPOTS : RED_SPOTS;
  const myLight    = mySide === 'red' ? '#fca5a5' : '#93c5fd';
  const oppLight   = mySide === 'red' ? '#93c5fd' : '#fca5a5';
  const myAdv      = mySide === 'red' ? advanceRed : advanceBlue;
  const oppAdv     = mySide === 'red' ? advanceBlue : advanceRed;

  const [pPieces, setPPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [aPieces, setAPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [turn, setTurn]       = useState<'p'|'a'>('p');
  const [dice, setDice]       = useState<number|null>(null);
  const [pendingDice, setPendingDice] = useState<number|null>(null);
  const [movable, setMovable] = useState<number[]>([]);
  const [over, setOver]       = useState(false);
  const [started, setStarted] = useState(false);

  const pRef     = useRef<number[]>([-1,-1,-1,-1]);
  const aRef     = useRef<number[]>([-1,-1,-1,-1]);
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
    endedRef.current = false;
    return () => { endedRef.current = true; timeoutsRef.current.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    onMessage('Roll a 6 to enter! Tap a glowing piece to move it.');
  }, [onMessage]);

  const doAi = useCallback(() => {
    if (endedRef.current || overRef.current) return;
    const d = rollDie();
    setDice(d);

    const mv = getMovableIndices(aRef.current, d, mySide !== 'red');

    if (mv.length === 0) {
      onMessage(`AI rolled ${d} — no piece can move.`);
      setTurn('p');
      return;
    }

    let bestIdx = mv[0], bestScore = -Infinity;
    for (const i of mv) {
      const np = oppAdv(aRef.current[i], d);
      const s  = scoreMove(np, pRef.current);
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    }

    const apieces = [...aRef.current];
    const np = oppAdv(apieces[bestIdx], d);
    apieces[bestIdx] = np;
    aRef.current = apieces;
    setAPieces([...apieces]);

    const ppieces = [...pRef.current];
    let captured = false;
    if (np >= 0 && np < 52 && !SAFE_POSITIONS.has(np)) {
      for (let pi = 0; pi < 4; pi++) {
        if (ppieces[pi] === np) { ppieces[pi] = -1; captured = true; }
      }
    }
    if (captured) {
      pRef.current = ppieces;
      setPPieces([...ppieces]);
      onMessage(`AI rolled ${d} — captured your piece!`);
    } else if (np >= 58) {
      const hc = apieces.filter(p => p >= 58).length;
      onMessage(`AI piece reached home! (${hc}/4) 💙`);
    } else {
      const label = np >= 52 ? `home stretch ${np-51}/6` : `sq ${np}`;
      onMessage(`AI rolled ${d} → ${label}`);
    }

    if (apieces.every(p => p >= 58)) {
      overRef.current = true; setOver(true);
      endedRef.current = true;
      schedule(() => onEnd({ score: 10, stars: 1, summary: 'AI got all 4 pieces home. Better luck next time!' }), 1500);
      return;
    }

    if (d === 6 && !overRef.current) { onMessage('AI rolled 6 — bonus!'); schedule(doAi, 700); return; }
    setTurn('p');
  }, [mySide, oppAdv, onMessage, onEnd, schedule]);

  const movePiece = useCallback((idx: number, d: number) => {
    const pieces = [...pRef.current];
    const np = myAdv(pieces[idx], d);
    pieces[idx] = np;
    pRef.current = pieces;
    setPPieces([...pieces]);

    const apieces = [...aRef.current];
    let captured = false;
    if (np >= 0 && np < 52 && !SAFE_POSITIONS.has(np)) {
      for (let ai = 0; ai < 4; ai++) {
        if (apieces[ai] === np) { apieces[ai] = -1; captured = true; }
      }
    }
    if (captured) {
      aRef.current = apieces;
      setAPieces([...apieces]);
      onMessage(`Rolled ${d} — captured an AI piece! 🔴`);
    } else if (np >= 58) {
      const hc = pieces.filter(p => p >= 58).length;
      onMessage(`Piece ${hc}/4 home! 🎉`);
    } else {
      const label = np >= 52 ? `home stretch ${np-51}/6` : `sq ${np}`;
      onMessage(`Rolled ${d} → ${label}`);
    }

    if (pieces.every(p => p >= 58)) {
      overRef.current = true; setOver(true);
      onScore(100); onProgress(1);
      endedRef.current = true;
      schedule(() => onEnd({ score: 100, stars: 3, summary: 'All 4 pieces home! You win!' }), 1000);
      return;
    }

    if (d === 6 && !overRef.current) { onMessage('Rolled 6 — bonus roll!'); return; }
    setTurn('a');
    schedule(doAi, 800);
  }, [myAdv, onMessage, onScore, onProgress, onEnd, schedule, doAi]);

  const handleRoll = () => {
    if (endedRef.current || overRef.current || turn !== 'p' || pendingDice !== null) return;
    const d = rollDie();
    setDice(d);

    const mv = getMovableIndices(pRef.current, d, mySide !== 'red');
    if (mv.length === 0) {
      onMessage(`Rolled ${d} — no piece can move!`);
      setTurn('a');
      schedule(doAi, 800);
      return;
    }
    if (mv.length === 1) { movePiece(mv[0], d); return; }
    setPendingDice(d);
    setMovable(mv);
    onMessage(`Rolled ${d} — tap a glowing piece to move!`);
  };

  const handlePieceClick = (idx: number) => {
    if (pendingDice === null || !movable.includes(idx)) return;
    const d = pendingDice;
    setPendingDice(null);
    setMovable([]);
    movePiece(idx, d);
  };

  const cx = (col: number) => col * C + C / 2;
  const cy = (row: number) => row * C + C / 2;

  const stackedXY = (pos: number, stretch: [number, number][], pieceIdx: number, allPieces: number[]): [number, number] => {
    const [row, col] = posCoord(pos, stretch);
    const bx = cx(col), by = cy(row);
    const rank = allPieces.slice(0, pieceIdx).filter(p => p === pos).length;
    const [ox, oy] = STACK_OFF[rank % 4];
    return [bx + (rank > 0 ? ox : 0), by + (rank > 0 ? oy : 0)];
  };

  const renderTokens = () => {
    const el: React.ReactElement[] = [];
    const r = C * 0.37;

    const homeX = 6*C + (3*C)/2;
    const homeY = 6*C + (3*C)/2;
    const redFin: [number,number][] = [
      [homeX - C*0.3, homeY - C*0.5],
      [homeX + C*0.3, homeY - C*0.5],
      [homeX - C*0.3, homeY - C*0.05],
      [homeX + C*0.3, homeY - C*0.05],
    ];
    const blueFin: [number,number][] = [
      [homeX - C*0.3, homeY + C*0.05],
      [homeX + C*0.3, homeY + C*0.05],
      [homeX - C*0.3, homeY + C*0.5],
      [homeX + C*0.3, homeY + C*0.5],
    ];
    const myFin  = mySide === 'red' ? redFin  : blueFin;
    const oppFin = mySide === 'red' ? blueFin : redFin;

    const drawToken = (
      id: string, tx: number, ty: number,
      color: string, light: string, label: string,
      isActive: boolean, isMovable: boolean,
      scale = 1.0,
      onClick?: () => void,
    ) => {
      const tr = r * scale;
      return [
        <circle key={`${id}-sh`} cx={tx+1} cy={ty+2} r={tr+1} fill="rgba(0,0,0,0.45)" style={{ pointerEvents:'none' }} />,
        ...(isMovable ? [
          <circle key={`${id}-pulse`} cx={tx} cy={ty} r={tr+5}
            fill="none" stroke={color} strokeWidth={2.5} opacity={0.65}
            style={{ animation:'ping 1s cubic-bezier(0,0,0.2,1) infinite', pointerEvents:'none' }} />,
        ] : isActive ? [
          <circle key={`${id}-glow`} cx={tx} cy={ty} r={tr+3.5}
            fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} style={{ pointerEvents:'none' }} />,
        ] : []),
        <circle key={`${id}-body`} cx={tx} cy={ty} r={tr}
          fill={color}
          stroke={isMovable ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)'}
          strokeWidth={isMovable ? 2.2 : 1.4}
          style={{ cursor: onClick ? 'pointer' : 'default' }}
          onClick={onClick} />,
        <circle key={`${id}-hl`} cx={tx-tr*0.28} cy={ty-tr*0.3} r={tr*0.4}
          fill={light} opacity={0.42} style={{ pointerEvents:'none' }} />,
        <text key={`${id}-txt`} x={tx} y={ty+1} textAnchor="middle" dominantBaseline="central"
          fontSize={tr*0.88} fill="white" fontWeight="bold" style={{ pointerEvents:'none' }}>
          {label}
        </text>,
      ];
    };

    let pFinCount = 0;
    pPieces.forEach((pos, i) => {
      const id  = `p${i}`;
      const isM = movable.includes(i);
      const onClick = isM ? () => handlePieceClick(i) : undefined;

      if (pos === -1) {
        const [sc, sr] = mySpots[i];
        el.push(...drawToken(id, cx(sc), cy(sr), myColor, myLight, String(i+1), turn==='p', isM, 1, onClick));
      } else if (pos >= 58) {
        const [fx, fy] = myFin[pFinCount++];
        el.push(...drawToken(id, fx, fy, myColor, myLight, '✓', false, false, 0.62));
      } else {
        const [tx, ty] = stackedXY(pos, myStretch, i, pPieces);
        el.push(...drawToken(id, tx, ty, myColor, myLight, String(i+1), turn==='p', isM, 1, onClick));
      }
    });

    let aFinCount = 0;
    aPieces.forEach((pos, i) => {
      const id = `a${i}`;

      if (pos === -1) {
        const [sc, sr] = oppSpots[i];
        el.push(...drawToken(id, cx(sc), cy(sr), oppColor, oppLight, String(i+1), turn==='a', false));
      } else if (pos >= 58) {
        const [fx, fy] = oppFin[aFinCount++];
        el.push(...drawToken(id, fx, fy, oppColor, oppLight, '✓', false, false, 0.62));
      } else {
        const [tx, ty] = stackedXY(pos, oppStretch, i, aPieces);
        el.push(...drawToken(id, tx, ty, oppColor, oppLight, String(i+1), turn==='a', false));
      }
    });

    return el;
  };

  const pHome = pPieces.filter(p => p >= 58).length;
  const aHome = aPieces.filter(p => p >= 58).length;
  const pPct  = Math.round(pPieces.reduce((s,p) => s + (p<0?0:p>=58?58:p), 0) / (58*4) * 100);
  const aPct  = Math.round(aPieces.reduce((s,p) => s + (p<0?0:p>=58?58:p), 0) / (58*4) * 100);

  return (
    <div className="h-full flex flex-col items-center p-2 gap-1.5">
      <div className="flex-shrink-0 w-full flex justify-center">
        <svg viewBox={`0 0 ${W} ${W}`} className="rounded-xl w-full h-auto shadow-2xl"
          style={{ maxWidth: 390, maxHeight: '52vh' }}>
          {renderTokens()}
        </svg>
      </div>
    </div>
  );
}
