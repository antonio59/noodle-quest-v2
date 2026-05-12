import { useState, useRef, useCallback } from 'react';

function LudoGame() {
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

  const doAi = useCallback(() => {
    if (endedRef.current || overRef.current) return;
    if (overRef.current) { setOver(true); }
    const apieces = [...aRef.current];
    aRef.current = apieces;
    setAPieces([...apieces]);
    if (apieces.every(p => p >= 58)) {
      overRef.current = true; setOver(true);
      endedRef.current = true;
      schedule(() => {}, 1500);
      return;
    }
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
    if (pieces.every(p => p >= 58)) {
      overRef.current = true; setOver(true);
      endedRef.current = true;
      schedule(() => {}, 1000);
      return;
    }
    if (d === 6 && !overRef.current) { return; }
    setTurn('a');
    schedule(doAi, 800);
  }, [schedule, doAi]);

  const handlePieceClick = (idx: number) => {
    movePiece(idx, 1);
  };

  const renderTokens = () => {
    const el: React.ReactElement[] = [];
    pPieces.forEach((pos, i) => {
      const isM = movable.includes(i);
      const onClick = isM ? () => handlePieceClick(i) : undefined;
      el.push(<circle key={`p${i}`} onClick={onClick} />);
    });
    aPieces.forEach((pos, i) => {
      el.push(<circle key={`a${i}`} />);
    });
    return el;
  };
  
  return (
    <svg>
      {renderTokens()}
    </svg>
  );
}
