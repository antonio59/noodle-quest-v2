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
      className="grid gap-0.5 border-2 border-card-hover p-1 bg-surface rounded-lg"
      style={{ gridTemplateColumns: `repeat(${puzzle.gridSize}, minmax(0, 1fr))` }}
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
                className="aspect-square bg-black/90 rounded-sm"
                aria-hidden="true"
              />
            );
          }

          const base = 'relative aspect-square rounded-sm border flex items-center justify-center';
          const theme = highlighted
            ? isActive
              ? 'bg-accent-soft border-accent'
              : 'bg-primary/15 border-primary/50'
            : 'bg-[#2a2850] border-[#3d3a60]';

          return (
            <div key={`${r}-${c}`} className={`${base} ${theme}`}>
              {num ? (
                <span className="absolute top-0.5 left-0.5 text-[10px] leading-none text-text-muted select-none">
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
                className={`w-full h-full text-center font-bold uppercase caret-transparent focus:outline-none bg-transparent ${
                  cell.isError ? 'text-danger' : cell.isRevealed ? 'text-accent' : 'text-text'
                }`}
                maxLength={1}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
