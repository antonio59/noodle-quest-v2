import { useState, useRef, useCallback } from 'react';

const C = 26;

function LudoGame() {
  const mySide = 'red';
  const myStretch: [number,number][] = [[7,1],[7,2]];
  const oppStretch: [number,number][] = [[7,13],[7,12]];
  const myColor = '#ef4444';
  const myLight = '#fca5a5';
  const mySpots: [number,number][] = [[1.7,1.7]];
  const oppSpots: [number,number][] = [[10.7,10.7]];

  const [pPieces, setPPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [aPieces, setAPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [turn, setTurn] = useState<'p'|'a'>('p');
  const [movable, setMovable] = useState<number[]>([]);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);

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

  const doAi = useCallback(() => {
    if (endedRef.current || overRef.current) return;
    if (overRef.current) { setOver(true); }
    if (!overRef.current) { schedule(doAi, 700); return; }
    setTurn('p');
  }, [schedule]);

  const movePiece = useCallback((idx: number, d: number) => {
    const pieces = [...pRef.current];
    pRef.current = pieces;
    setPPieces([...pieces]);
    const apieces = [...aRef.current];
    aRef.current = apieces;
    setAPieces([...apieces]);
    if (d === 6 && !overRef.current) { return; }
    setTurn('a');
    schedule(doAi, 800);
  }, [schedule, doAi]);

  const handlePieceClick = (idx: number) => {
    movePiece(idx, 1);
  };

  const cx = (col: number) => col * C + C / 2;
  const cy = (row: number) => row * C + C / 2;

  const renderTokens = () => {
    const el: React.ReactElement[] = [];
    const r = C * 0.37;

    const pFinCount = 0;
    pPieces.forEach((pos, i) => {
      const isM = movable.includes(i);
      const onClick = isM ? () => handlePieceClick(i) : undefined;

      if (pos === -1) {
        const [sc, sr] = mySpots[i];
        el.push(<circle key={`p${i}`} cx={cx(sc)} cy={cy(sr)} />);
      } else {
        el.push(<circle key={`p${i}`} cx={100} cy={100} />);
      }
    });

    aPieces.forEach((pos, i) => {
      if (pos === -1) {
        const [sc, sr] = oppSpots[i];
        el.push(<circle key={`a${i}`} cx={cx(sc)} cy={cy(sr)} />);
      } else {
        el.push(<circle key={`a${i}`} cx={200} cy={200} />);
      }
    });

    return el;
  };

  return (
    <svg>
      {renderTokens()}
    </svg>
  );
}
