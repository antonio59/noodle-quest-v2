import { useState, useRef, useCallback } from 'react';

const C = 26;
const RED_STRETCH: [number, number][] = [[7,1],[7,2]];
const BLUE_STRETCH: [number, number][] = [[7,13],[7,12]];
const RED_SPOTS: [number, number][] = [[1.7,1.7],[3.3,1.7]];
const BLUE_SPOTS: [number, number][] = [[10.7,10.7],[12.3,10.7]];
const STACK_OFF: [number, number][] = [[-4,-4],[4,-4]];
const TRACK: [number, number][] = [[6,1],[6,2]];

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
  const myStretch = RED_STRETCH;
  const oppStretch = BLUE_STRETCH;
  const myColor = '#ef4444';
  const oppColor = '#3b82f6';
  const mySpots = RED_SPOTS;
  const oppSpots = BLUE_SPOTS;
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

  // REMOVE useRef usage entirely from callbacks
  const doAi = useCallback(() => {
    // No ref accesses
    setTurn('p');
  }, []);

  const movePiece = useCallback((idx: number, d: number) => {
    setPPieces(prev => prev);
    setAPieces(prev => prev);
    setTurn('a');
    setOver(false);
  }, []);

  const handlePieceClick = (idx: number) => {};

  const cx = (col: number) => col * C + C / 2;
  const cy = (row: number) => row * C + C / 2;

  const renderTokens = () => {
    const el: React.ReactElement[] = [];
    const r = C * 0.37;

    const homeX = 6*C + (3*C)/2;
    const homeY = 6*C + (3*C)/2;
    const redFin: [number,number][] = [[homeX - C*0.3, homeY - C*0.5]];
    const blueFin: [number,number][] = [[homeX - C*0.3, homeY + C*0.05]];
    const myFin = redFin;
    const oppFin = blueFin;

    const drawToken = (
      id: string, tx: number, ty: number,
      color: string, light: string, label: string,
      isActive: boolean, isMovable: boolean,
      scale = 1.0,
      onClick?: () => void,
    ) => {
      const tr = r * scale;
      return [
        <circle key={`${id}-body`} cx={tx} cy={ty} r={tr}
          fill={color} onClick={onClick} />,
        <text key={`${id}-txt`} x={tx} y={ty+1}>{label}</text>,
      ];
    };

    let pFinCount = 0;
    pPieces.forEach((pos, i) => {
      const id  = `p${i}`;
      const isM = movable.includes(i);
      if (pos === -1) {
        const [sc, sr] = mySpots[i];
        el.push(...drawToken(id, cx(sc), cy(sr), myColor, myLight, String(i+1), turn==='p', isM, 1));
      } else if (pos >= 58) {
        const [fx, fy] = myFin[pFinCount++];
        el.push(...drawToken(id, fx, fy, myColor, myLight, '✓', false, false, 0.62));
      } else {
        const [tx, ty] = stackedXY(pos, myStretch, i, pPieces);
        el.push(...drawToken(id, tx, ty, myColor, myLight, String(i+1), turn==='p', isM, 1));
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
