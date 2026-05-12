import { useState, useRef, useCallback } from 'react';

const C = 26;

const RED_STRETCH: [number, number][] = [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]];
const BLUE_STRETCH: [number, number][] = [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]];
const RED_SPOTS: [number, number][] = [[1.7,1.7],[3.3,1.7],[1.7,3.3],[3.3,3.3]];
const BLUE_SPOTS: [number, number][] = [[10.7,10.7],[12.3,10.7],[10.7,12.3],[12.3,12.3]];
const STACK_OFF: [number, number][] = [[-4,-4],[4,-4],[-4,4],[4,4]];
const TRACK: [number, number][] = [[6,1],[6,2],[6,3],[6,4],[6,5]];

function posCoord(pos: number, stretch: [number, number][]): [number, number] {
  if (pos < 0) return [-1, -1];
  if (pos < 52) return TRACK[pos];
  if (pos < 58) return stretch[pos - 52];
  return [7, 7];
}

interface GameProps {
  stage: string;
  onScore: (n: number) => void;
  onProgress: (n: number) => void;
  onMessage: (s: string) => void;
  onEnd: (o: Record<string, unknown>) => void;
}

function LudoGame({ stage, onScore, onProgress, onMessage, onEnd }: GameProps) {
  const mySide = 'red';
  const myStretch = mySide === 'red' ? RED_STRETCH : BLUE_STRETCH;
  const oppStretch = mySide === 'red' ? BLUE_STRETCH : RED_STRETCH;
  const myColor = '#ef4444';
  const oppColor = '#3b82f6';
  const mySpots = mySide === 'red' ? RED_SPOTS : BLUE_SPOTS;
  const oppSpots = mySide === 'red' ? BLUE_SPOTS : RED_SPOTS;
  const myLight = '#fca5a5';
  const oppLight = '#93c5fd';

  const [pPieces, setPPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [aPieces, setAPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [turn, setTurn] = useState<'p'|'a'>('p');
  const [movable, setMovable] = useState<number[]>([]);
  const [over, setOver] = useState(false);

  const pRef = useRef<number[]>([-1,-1,-1,-1]);
  const aRef = useRef<number[]>([-1,-1,-1,-1]);
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
    endedRef.current = false;
    return () => { endedRef.current = true; timeoutsRef.current.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    onMessage('Roll a 6 to enter! Tap a glowing piece to move it.');
  }, [onMessage]);

  const doAi = useCallback(() => {
    if (endedRef.current || overRef.current) return;
    const d = 1;
    const mv = [0];
    if (mv.length === 0) {
      onMessage(`AI rolled ${d} — no piece can move.`);
      setTurn('p');
      return;
    }
    let bestIdx = mv[0], bestScore = -Infinity;
    for (const i of mv) {
      const np = 0;
      const s  = 0;
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    }
    const apieces = [...aRef.current];
    const np = 0;
    apieces[bestIdx] = np;
    aRef.current = apieces;
    setAPieces([...apieces]);
    const ppieces = [...pRef.current];
    pRef.current = ppieces;
    setPPieces([...ppieces]);
    if (apieces.every(p => p >= 58)) {
      overRef.current = true; setOver(true);
      endedRef.current = true;
      schedule(() => onEnd({ score: 10, stars: 1, summary: '' }), 1500);
      return;
    }
    if (d === 6 && !overRef.current) { onMessage('AI rolled 6 — bonus!'); schedule(doAi, 700); return; }
    setTurn('p');
  }, [onMessage, onEnd, schedule]);

  const movePiece = useCallback((idx: number, d: number) => {
    const pieces = [...pRef.current];
    pRef.current = pieces;
    setPPieces([...pieces]);
    const apieces = [...aRef.current];
    aRef.current = apieces;
    setAPieces([...apieces]);
    if (pieces.every(p => p >= 58)) {
      overRef.current = true; setOver(true);
      onScore(100); onProgress(1);
      endedRef.current = true;
      schedule(() => onEnd({ score: 100, stars: 3, summary: '' }), 1000);
      return;
    }
    if (d === 6 && !overRef.current) { onMessage('Rolled 6 — bonus roll!'); return; }
    setTurn('a');
    schedule(doAi, 800);
  }, [onMessage, onScore, onProgress, onEnd, schedule, doAi]);

  const handlePieceClick = (idx: number) => {
    movePiece(idx, 1);
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
    ];
    const blueFin: [number,number][] = [
      [homeX - C*0.3, homeY + C*0.05],
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
        <circle key={`${id}-sh`} cx={tx+1} cy={ty+2} r={tr+1} />,
        ...(isMovable ? [
          <circle key={`${id}-pulse`} cx={tx} cy={ty} r={tr+5} />,
        ] : isActive ? [
          <circle key={`${id}-glow`} cx={tx} cy={ty} r={tr+3.5} />,
        ] : []),
        <circle key={`${id}-body`} cx={tx} cy={ty} r={tr}
          fill={color}
          stroke={isMovable ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)'}
          strokeWidth={isMovable ? 2.2 : 1.4}
          style={{ cursor: onClick ? 'pointer' : 'default' }}
          onClick={onClick} />,
        <circle key={`${id}-hl`} cx={tx-tr*0.28} cy={ty-tr*0.3} r={tr*0.4}
          fill={light} opacity={0.42} />,
        <text key={`${id}-txt`} x={tx} y={ty+1} textAnchor="middle" dominantBaseline="central"
          fontSize={tr*0.88} fill="white" fontWeight="bold">
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

  return (
    <div>
      <svg>
        {renderTokens()}
      </svg>
    </div>
  );
}
