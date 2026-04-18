interface WordSearchGridProps {
  grid: string[][];
  gridSize: number;
  cellStateFor: (r: number, c: number) => { selected: boolean; found: boolean; highlightClass: string };
  onMouseDown: (r: number, c: number) => void;
  onMouseEnter: (r: number, c: number) => void;
  onMouseUp: () => void;
  onTouchStart: (r: number, c: number) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function WordSearchGrid({
  grid,
  gridSize,
  cellStateFor,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: WordSearchGridProps) {
  return (
    <div
      className="grid gap-1 select-none touch-none"
      style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(2.25rem, 3rem))` }}
      onMouseLeave={onMouseUp}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
    >
      {grid.map((row, r) =>
        row.map((ch, c) => {
          const state = cellStateFor(r, c);
          let cls =
            'game-cell aspect-square flex items-center justify-center rounded-sm border font-bold uppercase cursor-pointer transition select-none ';
          if (state.found) {
            cls += `${state.highlightClass || 'bg-success/40'} border-transparent text-bg `;
          } else if (state.selected) {
            cls += 'bg-accent/30 border-accent text-text ring-2 ring-accent ';
          } else {
            cls += 'bg-surface border-card-hover hover:bg-card-hover text-text ';
          }
          return (
            <div
              key={`${r}-${c}`}
              data-r={r}
              data-c={c}
              onMouseDown={() => onMouseDown(r, c)}
              onMouseEnter={() => onMouseEnter(r, c)}
              onTouchStart={() => onTouchStart(r, c)}
              onTouchMove={onTouchMove}
              className={cls}
            >
              {ch}
            </div>
          );
        })
      )}
    </div>
  );
}
