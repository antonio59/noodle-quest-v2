import type { CrosswordPuzzle, PlacedWord } from '@/lib/puzzle-engine/crossword/types';

interface CrosswordGridProps {
  puzzle: CrosswordPuzzle;
  grid: { value: string; isRevealed: boolean; isError: boolean }[][];
  activeWordId: string | null;
  activeCell: { r: number; c: number } | null;
  numberMap: Map<string, number>;
  cellToWords: Map<string, string[]>;
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  onCellClick: (r: number, c: number) => void;
  onKeyDown: (r: number, c: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onChange: (r: number, c: number, value: string) => void;
}

export function CrosswordGrid({
  puzzle,
  grid,
  activeWordId,
  activeCell,
  numberMap,
  cellToWords,
  inputRefs,
  onCellClick,
  onKeyDown,
  onChange,
}: CrosswordGridProps) {
  const activeWord = activeWordId
    ? puzzle.words.find(w => w.id === activeWordId) ?? null
    : null;

  const isHighlighted = (r: number, c: number) => {
    if (!activeWord) return false;
    for (let i = 0; i < activeWord.word.length; i++) {
      const rr = activeWord.direction === 'across' ? activeWord.row : activeWord.row + i;
      const cc = activeWord.direction === 'across' ? activeWord.col + i : activeWord.col;
      if (rr === r && cc === c) return true;
    }
    return false;
  };

  return (
    <div
      className="grid rounded-sm overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${puzzle.gridSize}, 1fr)`,
        gap: 1.5,
        background: '#0a0818',
        padding: 1.5,
      }}
      role="grid"
      aria-label="Crossword grid"
    >
      {Array.from({ length: puzzle.gridSize }).map((_, r) =>
        Array.from({ length: puzzle.gridSize }).map((__, c) => {
          const isPart = !!cellToWords.get(`${r},${c}`);
          const num = numberMap.get(`${r},${c}`);
          const cell = grid[r][c];
          const highlighted = isHighlighted(r, c);
          const isActive = activeCell?.r === r && activeCell?.c === c;

          if (!isPart) {
            return (
              <div
                key={`${r}-${c}`}
                className="aspect-square bg-[#080616]"
                aria-hidden="true"
              />
            );
          }

          let bgClass = 'bg-[#16132e]';
          if (isActive) bgClass = 'bg-accent/35';
          else if (highlighted) bgClass = 'bg-[#2a2070]';

          let textClass = 'text-text';
          if (cell.isError) textClass = 'text-red-400';
          else if (cell.isRevealed) textClass = 'text-emerald-400';

          let ringClass = '';
          if (isActive) ringClass = 'ring-2 ring-inset ring-accent';
          else if (highlighted) ringClass = 'ring-1 ring-inset ring-accent/40';

          return (
            <div key={`${r}-${c}`} className={`relative aspect-square ${bgClass} transition-colors duration-75`}>
              {num ? (
                <span className="absolute top-[1.5px] left-[1.5px] text-[7px] sm:text-[9px] leading-none font-bold text-accent/70 select-none z-10 pointer-events-none">
                  {num}
                </span>
              ) : null}
              {cell.isRevealed && !cell.isError && (
                <span className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
              )}
              <input
                ref={el => { inputRefs.current[`${r},${c}`] = el; }}
                aria-label={`Row ${r + 1} Column ${c + 1}`}
                value={cell.value}
                onClick={() => onCellClick(r, c)}
                onKeyDown={e => onKeyDown(r, c, e)}
                onChange={e => onChange(r, c, e.target.value.slice(-1))}
                className={`w-full h-full text-center font-extrabold uppercase caret-transparent focus:outline-none bg-transparent text-sm sm:text-base tracking-tight ${textClass} ${ringClass}`}
                maxLength={1}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
