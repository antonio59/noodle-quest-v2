import { useState, useRef, useCallback } from 'react';

function LudoGame() {
  const mySide = 'red';
  const myColor = '#ef4444';
  const myLight = '#fca5a5';
  const mySpots: [number,number][] = [[1.7,1.7]];
  const oppSpots: [number,number][] = [[10.7,10.7]];

  const [pPieces, setPPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [aPieces, setAPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [turn, setTurn] = useState<'p'|'a'>('p');
  const [movable, setMovable] = useState<number[]>([]);
  const [over, setOver] = useState(false);

  const pRef = useRef<number[]>([-1,-1,-1,-1]);
  const aRef = useRef<number[]>([-1,-1,-1,-1]);
  const overRef = useRef(false);
  const endedRef = useRef(false);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      if (!endedRef.current) fn();
    }, delay);
    return id;
  }, []);

  const doAi = useCallback(() => {
    if (endedRef.current || overRef.current) return;
    const apieces = [...aRef.current];
    aRef.current = apieces;
    setAPieces([...apieces]);
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

  const renderTokens = () => {
    const el: React.ReactElement[] = [];
    pPieces.forEach((pos, i) => {
      const isM = movable.includes(i);
      const onClick = isM ? () => handlePieceClick(i) : undefined;
      el.push(<circle key={`p${i}`} onClick={onClick} />);
    });
    return el;
  };

  return (
    <svg>
      {renderTokens()}
    </svg>
  );
}
