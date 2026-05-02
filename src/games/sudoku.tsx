import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { GameProps } from '@/types';

// Puzzle format: 81-char string, '0' = empty. [puzzle, solution]
const PUZZLES: Array<[string, string]> = [
  // Easy
  ['530070000600195000098000060800060003400803001700020006060000280000419005000080079',
   '534678912672195348198342567859761423426853791713924856961537284287419635345286179'],
  ['010020300009005010600000000054000700000301000006000840000000001010700900002060050',
   '417826395389645712625931487154298736798351264236174849963482571812763924472519658'],
  ['200080300060070084030500209000105408000000000402706000301007040720040060004010003',
   '241986375569173284738524219976135428815492763423768951391657842752843196684219537'],
  ['000000907000420180000705026100904000050000040000507009920108000034059000507000000',
   '416832957795426183283715426169984275358271649642537819924168537834659712571343268'],
  ['030050040008010500460000012070502080000070000040803010860000051001040700020030090',
   '237956148918312567465748912371524689529871436846193725683469251191245873752637894'],
  // Medium
  ['020000000000600003074080000000003002080040010600500000000010780000007000009800400',
   '126437958891625473374981265419763582783542619652819734265194387538276941947853126'],
  ['000000000030600940080000050600000700040030010003000006010000090097003080000000000',
   '524897163731625948689143257165489732847231519293756486412578391957314826318962475'],
  ['000006000059000008200008000045000000003000200000100030000010050800000120000000000',
   '732156894659374218248598376145983762973642581861725439624819753897435126316267945'],
  ['700000006000097000040000800000007060000040000080200000009000050000760000200000003',
   '715843296638297514042615897521397468963548172487261359394182675859736241276954983'],
  ['000800000040060010008000530370600040000080000060007082084000300020050060000006000',
   '695814273742963815318275439371698542529381764864547182487129356293756981156432897'],
  // Hard
  ['800000000003600000070090200060005030004000300010400006002010000500987000000000800',
   '812753649943682175675491283469125738287936541135847926721364895594278312358219467'],
  ['000000000000003085001620400000090000540000230006800000067000040030001009000080006',
   '987654321246173985531629478823491657549867132176835294462918743738246519915382764'],
  ['000000085000210009960080100500800016000000000890006007009070052300054000480000000',
   '231946785574213869968785134527894316146537928893162547619378252375421693482659371'],
  ['000040700000000039050006800010200060060000070070004020003800040680000000009060000',
   '893241765417658239256796814914287563368915472572364128735829641681473952129563487'],
  ['100007090030020008009600500005300900010080002600004000300000010040000007007000300',
   '162857493534129678789643521845317962913568247627984135398275816451836729276491385'],
];

function parsePuzzle(s: string): number[][] {
  return Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => parseInt(s[r * 9 + c], 10))
  );
}

function isValid(grid: number[][], row: number, col: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num) return false;
    if (grid[i][col] === num) return false;
    const boxR = 3 * Math.floor(row / 3) + Math.floor(i / 3);
    const boxC = 3 * Math.floor(col / 3) + (i % 3);
    if (grid[boxR][boxC] === num) return false;
  }
  return true;
}

function getPuzzleIndex(stage: number, played: number): number {
  const difficulty = stage <= 3 ? 0 : stage <= 7 ? 1 : 2; // 0=easy, 1=medium, 2=hard
  const offset = difficulty * 5;
  return offset + (played % 5);
}

export default function SudokuGame({ stage, onScore, onProgress, onEnd, onMessage }: GameProps) {
  const [playedCount] = useState(0);
  const puzzleIdx = useMemo(() => getPuzzleIndex(stage, playedCount), [stage, playedCount]);
  const [puzzle, solution] = PUZZLES[puzzleIdx] ?? PUZZLES[0];

  const initialGrid = useMemo(() => parsePuzzle(puzzle), [puzzle]);
  const solutionGrid = useMemo(() => parsePuzzle(solution), [solution]);

  const [grid, setGrid] = useState<number[][]>(() => initialGrid.map(r => [...r]));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [checkCount, setCheckCount] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [complete, setComplete] = useState(false);

  const endedRef = useRef(false);
  const onEndRef = useRef(onEnd);
  const onScoreRef = useRef(onScore);
  const onProgressRef = useRef(onProgress);
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onScoreRef.current = onScore; }, [onScore]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  useEffect(() => {
    endedRef.current = false;
    return () => { endedRef.current = true; };
  }, []);

  useEffect(() => {
    onMessageRef.current('Fill in the grid — each row, column and 3×3 box uses 1–9 once.');
  }, []);

  const isFixed = useCallback((r: number, c: number) => initialGrid[r][c] !== 0, [initialGrid]);

  const filledCount = useMemo(() => grid.flat().filter(v => v !== 0).length, [grid]);
  const totalEmpty  = useMemo(() => initialGrid.flat().filter(v => v === 0).length, [initialGrid]);

  useEffect(() => {
    onProgressRef.current(Math.min((filledCount - (81 - totalEmpty)) / totalEmpty, 1));
  }, [filledCount, totalEmpty]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (complete) return;
    setSelected([r, c]);
  }, [complete]);

  const handleNumber = useCallback((num: number) => {
    if (!selected || complete) return;
    const [r, c] = selected;
    if (isFixed(r, c)) return;

    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = num;
    setGrid(newGrid);
    setErrors(new Set()); // clear errors on new input

    // Check if puzzle complete
    const isSolved = newGrid.every((row, ri) => row.every((val, ci) => val === solutionGrid[ri][ci]));
    if (isSolved) {
      setComplete(true);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const penaltyPerCheck = 30;
      const timePenalty = Math.floor(elapsed / 10);
      const score = Math.max(100, 500 - timePenalty - checkCount * penaltyPerCheck);
      onScoreRef.current(score);
      onProgressRef.current(1);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      const stars = elapsed < 180 ? 3 : elapsed < 360 ? 2 : 1;
      onMessageRef.current('🎉 Puzzle complete!');
      if (!endedRef.current) {
        endedRef.current = true;
        onEndRef.current({ score, stars, summary: `Completed Sudoku in ${timeStr}! Score: ${score}` });
      }
    }
  }, [selected, complete, isFixed, grid, solutionGrid, startTime, checkCount]);

  const handleErase = useCallback(() => {
    if (!selected || complete) return;
    const [r, c] = selected;
    if (isFixed(r, c)) return;
    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = 0;
    setGrid(newGrid);
    setErrors(new Set());
  }, [selected, complete, isFixed, grid]);

  const handleCheck = useCallback(() => {
    const newErrors = new Set<string>();
    grid.forEach((row, r) => row.forEach((val, c) => {
      if (val !== 0 && !isFixed(r, c) && val !== solutionGrid[r][c]) {
        newErrors.add(`${r},${c}`);
      }
    }));
    setErrors(newErrors);
    setCheckCount(n => n + 1);
    onMessageRef.current(newErrors.size === 0 ? '✓ No mistakes so far!' : `⚠️ ${newErrors.size} error${newErrors.size > 1 ? 's' : ''} found`);
  }, [grid, isFixed, solutionGrid]);

  const difficultyLabel = stage <= 3 ? 'Easy' : stage <= 7 ? 'Medium' : 'Hard';

  return (
    <div className="h-full flex flex-col items-center p-3 gap-2 select-none">
      <div className="flex justify-between items-center w-full max-w-sm">
        <span className="text-xs text-text-muted font-bold">{difficultyLabel} · Stage {stage}</span>
        <span className="text-xs text-text-muted">{filledCount - (81 - totalEmpty)}/{totalEmpty} filled</span>
        <button onClick={handleCheck} disabled={complete}
          className="text-xs px-2.5 py-1 rounded-lg bg-accent/15 text-accent font-bold disabled:opacity-40">
          Check
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-9 border-2 border-white/20 rounded-xl overflow-hidden"
        style={{ gap: 0 }}>
        {grid.map((row, r) =>
          row.map((val, c) => {
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const sameRow    = selected?.[0] === r;
            const sameCol    = selected?.[1] === c;
            const sameBox    = selected && Math.floor(selected[0] / 3) === Math.floor(r / 3) && Math.floor(selected[1] / 3) === Math.floor(c / 3);
            const isErr      = errors.has(`${r},${c}`);
            const fixed      = isFixed(r, c);
            const highlight  = selected && !isSelected && (sameRow || sameCol || sameBox);
            const sameNum    = selected && val !== 0 && val === grid[selected[0]][selected[1]];

            const borderR = (c + 1) % 3 === 0 && c < 8 ? '2px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.06)';
            const borderB = (r + 1) % 3 === 0 && r < 8 ? '2px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.06)';

            return (
              <div key={`${r}-${c}`} onClick={() => handleCellClick(r, c)}
                className="flex items-center justify-center cursor-pointer transition-all duration-75"
                style={{
                  width: 36, height: 36,
                  fontSize: '1rem',
                  fontWeight: fixed ? '700' : '500',
                  borderRight: borderR,
                  borderBottom: borderB,
                  background: isSelected ? 'rgba(167,139,250,0.35)' : isErr ? 'rgba(239,68,68,0.25)' : sameNum ? 'rgba(167,139,250,0.2)' : highlight ? 'rgba(167,139,250,0.08)' : 'transparent',
                  color: isErr ? '#ef4444' : fixed ? 'white' : val !== 0 ? '#a78bfa' : 'transparent',
                }}>
                {val || ''}
              </div>
            );
          })
        )}
      </div>

      {/* Number pad */}
      <div className="flex gap-1.5 flex-wrap justify-center max-w-sm">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => handleNumber(n)} disabled={complete}
            className="w-10 h-10 rounded-xl font-bold text-base bg-card text-text active:scale-90 transition-all disabled:opacity-40"
            style={{ border: '2px solid rgba(255,255,255,0.08)' }}>
            {n}
          </button>
        ))}
        <button onClick={handleErase} disabled={complete}
          className="w-10 h-10 rounded-xl text-sm bg-card text-text-muted active:scale-90 transition-all disabled:opacity-40"
          style={{ border: '2px solid rgba(255,255,255,0.08)' }}>
          ⌫
        </button>
      </div>

      {complete && (
        <div className="text-center text-emerald-400 font-bold text-lg animate-pulse">
          🎉 Puzzle Complete!
        </div>
      )}
    </div>
  );
}
