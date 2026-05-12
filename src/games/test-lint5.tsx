import { useState, useRef, useCallback } from 'react';

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
  const myStretch  = mySide === 'red' ? [[1,1]] : [[2,2]];
  const oppStretch = mySide === 'red' ? [[2,2]] : [[1,1]];
  const myColor    = mySide === 'red' ? '#ef4444' : '#3b82f6';
  const oppColor   = mySide === 'red' ? '#3b82f6' : '#ef4444';
  const mySpots    = mySide === 'red' ? [[1.7,1.7]] : [[10.7,10.7]];
  const oppSpots   = mySide === 'red' ? [[10.7,10.7]] : [[1.7,1.7]];
  const myLight    = mySide === 'red' ? '#fca5a5' : '#93c5fd';
  const oppLight   = mySide === 'red' ? '#93c5fd' : '#fca5a5';

  const [pPieces, setPPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [aPieces, setAPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [turn, setTurn]       = useState<'p'|'a'>('p');
  const [movable, setMovable] = useState<number[]>([]);
  const [over, setOver]       = useState(false);
  
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
    const apieces = [...aRef.current];
    aRef.current = apieces;
    setAPieces([...apieces]);
    if (apieces.every(p => p >= 58)) {
      overRef.current = true; setOver(true);
      endedRef.current = true;
      schedule(() => onEnd({ score: 10, stars: 1, summary: '' }), 1500);
      return;
    }
    if (!overRef.current) { schedule(doAi, 700); return; }
    setTurn('p');
  }, [onEnd, schedule]);

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
    if (d === 6 && !overRef.current) { return; }
    setTurn('a');
    schedule(doAi, 800);
  }, [onScore, onProgress, onEnd, schedule, doAi]);

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
