import { useState, useRef } from 'react';

function LudoGame() {
  const [pPieces, setPPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [aPieces, setAPieces] = useState<number[]>([-1,-1,-1,-1]);
  const [movable, setMovable] = useState<number[]>([]);
  const [turn, setTurn] = useState<'p'|'a'>('p');
  
  const pRef = useRef<number[]>([-1,-1,-1,-1]);
  const aRef = useRef<number[]>([-1,-1,-1,-1]);
  
  const mySide = 'red';
  const myStretch = [[1,1],[2,2]];
  const myColor = '#ef4444';
  const myLight = '#fca5a5';
  const mySpots = [[1.7,1.7],[3.3,1.7]] as [number,number][];
  const oppStretch = [[1,1],[2,2]];
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
  
  const handlePieceClick = (idx: number) => {
    console.log('clicked', idx);
  };
  
  const renderTokens = () => {
    const el: React.ReactElement[] = [];
    
    pPieces.forEach((pos, i) => {
      const id  = `p${i}`;
      const isM = movable.includes(i);
      const onClick = isM ? () => handlePieceClick(i) : undefined;
      
      if (pos === -1) {
        const [sc, sr] = mySpots[i];
        el.push(<circle key={id} cx={cx(sc)} cy={cy(sr)} />);
      }
    });
    
    aPieces.forEach((pos, i) => {
      const id = `a${i}`;
      
      if (pos === -1) {
        const [sc, sr] = oppSpots[i];
        el.push(<circle key={id} cx={cx(sc)} cy={cy(sr)} />);
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
