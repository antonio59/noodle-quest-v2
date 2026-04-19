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
      className="grid border border-[#3d3a60] bg-[#3d3a60] rounded-sm"
      style={{ gridTemplateColumns: `repeat(${puzzle.gridSize}, 1fr)` }}
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
                className="aspect-square bg-black"
                aria-hidden="true"
              />
            );
          }

          const bg = highlighted
            ? isActive
              ? 'bg-accent-soft'
              : 'bg-primary/15'
            : 'bg-[#2a2850]';

          return (
            <div key={`${r}-${c}`} className={`relative aspect-square ${bg}`}>
              {num ? (
                <span className="absolute top-[1px] left-[1px] text-[8px] sm:text-[10px] leading-none text-text-muted select-none z-10">
                  {num}
                </span>
              ) : null}
              <input
                ref={el => {
                  inputRefs.current[`${r},${c}`] = el;
                }}
                aria-label={`Row ${r + 1} Column ${c + 1}`}
                value={cell.value}
                onClick={() => onCellClick(r, c)}
                onKeyDown={e => onKeyDown(r, c, e)}
                onChange={e => onChange(r, c, e.target.value.slice(-1))}
                className={`w-full h-full text-center font-bold uppercase caret-transparent focus:outline-none bg-transparent text-sm sm:text-base ${
                  cell.isError ? 'text-danger' : cell.isRevealed ? 'text-accent' : 'text-text'
                } ${isActive ? 'ring-1 ring-inset ring-accent' : highlighted ? 'ring-1 ring-inset ring-primary/40' : ''}`}
                maxLength={1}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
