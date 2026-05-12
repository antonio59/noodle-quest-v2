import { useState, useRef } from 'react';

function LudoGame() {
  const [pPieces, setPPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [aPieces, setAPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [movable, setMovable] = useState<number[]>([]);
  const [turn, setTurn] = useState<'p'|'a'>('p');
  
  const pRef = useRef<number[]>([-1,-1,-1,-1]);
  const aRef = useRef<number[]>([-1,-1,-1,-1]);
  const overRef = useRef(false);
  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = (fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter(x => x !== id);
      if (!endedRef.current) fn();
    }, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  const doAi = () => {
    if (endedRef.current || overRef.current) return;
    const apieces = [...aRef.current];
    aRef.current = apieces;
    setAPieces([...apieces]);
    
    const ppieces = [...pRef.current];
    pRef.current = ppieces;
    setPPieces([...ppieces]);
    
    if (d === 6 && !overRef.current) { schedule(doAi, 700); return; }
    setTurn('p');
  };

  const movePiece = (idx: number, d: number) => {
    const pieces = [...pRef.current];
    pRef.current = pieces;
    setPPieces([...pieces]);
    
    const apieces = [...aRef.current];
    aRef.current = apieces;
    setAPieces([...apieces]);
    
    if (d === 6 && !overRef.current) { return; }
    setTurn('a');
    schedule(doAi, 800);
  };

  const handleRoll = () => {
    if (endedRef.current || overRef.current || turn !== 'p') return;
    const d = 1;
    const mv = getMovableIndices(pRef.current, d, false);
    if (mv.length === 1) { movePiece(mv[0], d); return; }
    setMovable(mv);
  };

  const handlePieceClick = (idx: number) => {
    if (movable.includes(idx)) {
      movePiece(idx, 1);
    }
  };

  const mySide = 'red';
  const myStretch = [[1,1],[2,2]] as [number,number][];
  const myColor = '#ef4444';
  const myLight = '#fca5a5';
  const mySpots = [[1.7,1.7],[3.3,1.7]] as [number,number][];
  const oppStretch = [[1,1],[2,2]] as [number,number][];
  const oppColor = '#3b82f6';
  const oppLight = '#93c5fd';
  const oppSpots = [[10.7,10.7],[12.3,10.7]] as [number,number][];
  
  const redFin = [[1,1],[2,2]] as [number,number][];
  const blueFin = [[1,1],[2,2]] as [number,number][];
  const myFin = mySide === 'red' ? redFin : blueFin;
  const oppFin = mySide === 'red' ? blueFin : redFin;
  
  const C = 26;
  const cx = (col: number) => col * C + C / 2;
  const cy = (row: number) => row * C + C / 2;
  
  function getMovableIndices(pieces: number[], d: number, isBlue: boolean): number[] {
    return [];
  }
  
  const renderTokens = () => {
    const el: React.ReactElement[] = [];
    
    pPieces.forEach((pos, i) => {
      const id  = `p${i}`;
      const isM = movable.includes(i);
      const onClick = isM ? () => handlePieceClick(i) : undefined;
      
      if (pos === -1) {
        const [sc, sr] = mySpots[i];
        el.push(<circle key={id} cx={cx(sc)} cy={cy(sr)} />);
      } else if (pos >= 58) {
        const [fx, fy] = myFin[i];
        el.push(<circle key={id} cx={fx} cy={fy} />);
      } else {
        el.push(<circle key={id} cx={100} cy={100} />);
      }
    });
    
    aPieces.forEach((pos, i) => {
      const id = `a${i}`;
      if (pos === -1) {
        const [sc, sr] = oppSpots[i];
        el.push(<circle key={id} cx={cx(sc)} cy={cy(sr)} />);
      } else if (pos >= 58) {
        el.push(<circle key={id} cx={100} cy={100} />);
      } else {
        el.push(<circle key={id} cx={100} cy={100} />);
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
