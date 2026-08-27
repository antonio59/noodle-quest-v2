import type { WSPlacement } from '@/lib/puzzle-engine/wordsearch/types';

export interface FoundWordOverlay {
  word: string;
  cells: [number, number][];
  color: string;
}

interface WordSearchGridProps {
  grid: string[][];
  gridSize: number;
  cellStateFor: (r: number, c: number) => { selected: boolean; found: boolean };
  foundOverlays: FoundWordOverlay[];
  onMouseDown: (r: number, c: number) => void;
  onMouseEnter: (r: number, c: number) => void;
  onMouseUp: () => void;
  onTouchStart: (r: number, c: number) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

const CELL_REM = 2.25;
const GAP_REM = 0.125;

export function WordSearchGrid({
  grid,
  gridSize,
  cellStateFor,
  foundOverlays,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: WordSearchGridProps) {
  const boardRem = gridSize * CELL_REM + (gridSize - 1) * GAP_REM;

  return (
    <div
      className="relative select-none touch-none"
      style={{ width: `${boardRem}rem`, height: `${boardRem}rem` }}
      onMouseLeave={onMouseUp}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
    >
      {/* Found-word pill overlay (behind letters) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {foundOverlays.map(ov => (
          <WordPill key={ov.word} overlay={ov} />
        ))}
      </div>

      {/* Letter grid */}
      <div
        className="grid relative z-10"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, ${CELL_REM}rem)`,
          gridAutoRows: `${CELL_REM}rem`,
          gap: `${GAP_REM}rem`,
        }}
      >
        {grid.map((row, r) =>
          row.map((ch, c) => {
            const state = cellStateFor(r, c);
            return (
              <div
                key={`${r}-${c}`}
                data-r={r}
                data-c={c}
                onMouseDown={() => onMouseDown(r, c)}
                onMouseEnter={() => onMouseEnter(r, c)}
                onTouchStart={() => onTouchStart(r, c)}
                onTouchMove={onTouchMove}
                className={[
                  'flex items-center justify-center font-bold uppercase cursor-pointer rounded-md transition-all duration-75 relative',
                  state.found
                    ? 'text-white font-extrabold'
                    : state.selected
                      ? 'bg-accent text-white ring-2 ring-white/60 scale-105 shadow-lg shadow-accent/30 z-20'
                      : 'bg-[#142824] text-teal-200 hover:bg-[#23423b] hover:text-white',
                ].join(' ')}
                style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}
              >
                {ch}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function WordPill({ overlay }: { overlay: FoundWordOverlay }) {
  const cells = overlay.cells;
  if (cells.length === 0) return null;

  const [sr, sc] = cells[0];
  const [er, ec] = cells[cells.length - 1];

  const cx1 = sc * (CELL_REM + GAP_REM) + CELL_REM / 2;
  const cy1 = sr * (CELL_REM + GAP_REM) + CELL_REM / 2;
  const cx2 = ec * (CELL_REM + GAP_REM) + CELL_REM / 2;
  const cy2 = er * (CELL_REM + GAP_REM) + CELL_REM / 2;

  const dx = cx2 - cx1;
  const dy = cy2 - cy1;
  const length = Math.sqrt(dx * dx + dy * dy) + CELL_REM * 0.88;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  const midX = (cx1 + cx2) / 2;
  const midY = (cy1 + cy2) / 2;
  const thickness = CELL_REM * 0.86;

  return (
    <div
      className="absolute rounded-full"
      style={{
        left: `${midX}rem`,
        top: `${midY}rem`,
        width: `${length}rem`,
        height: `${thickness}rem`,
        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        background: overlay.color,
        opacity: 0.82,
        boxShadow: `0 0 8px ${overlay.color}88`,
      }}
    />
  );
}
