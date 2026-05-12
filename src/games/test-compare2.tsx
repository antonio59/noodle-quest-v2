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

  // Try with handlePieceClick reading movable state
  const handlePieceClick = (idx: number) => {
    if (movable.includes(idx)) {
      movePiece(idx, 1);
    }
  };

  const movePiece = () => {};

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
