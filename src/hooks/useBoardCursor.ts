import { useCallback, useState } from 'react';

interface BoardCursorOptions {
  rows: number;
  cols: number;
  /** Called when the user presses Enter/Space on a square. */
  onActivate: (row: number, col: number) => void;
  /** Accessible description of a square, announced as the cursor moves. */
  describe: (row: number, col: number) => string;
  /** Where the cursor appears when the board first receives focus. */
  initial?: [number, number];
}

/**
 * Keyboard navigation for grid game boards rendered as SVG.
 *
 * Attach the returned handlers to a focusable board element
 * (tabIndex={0}): arrow keys move a visible cursor, Enter/Space activates
 * the square (same as clicking it), Escape hides the cursor.
 *
 * `announce` is derived on every render — not captured at keypress time —
 * so after an activation updates game state (selection, a moved piece),
 * the live region reflects the new state automatically.
 */
export function useBoardCursor({ rows, cols, onActivate, describe, initial = [0, 0] }: BoardCursorOptions) {
  const [cursor, setCursor] = useState<[number, number] | null>(null);

  const announce = cursor ? describe(cursor[0], cursor[1]) : '';

  const onFocus = useCallback(() => {
    setCursor(cur => cur ?? initial);
  }, [initial]);

  const onBlur = useCallback(() => {
    setCursor(null);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const [r, c] = cursor ?? initial;
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setCursor([Math.max(0, r - 1), c]);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setCursor([Math.min(rows - 1, r + 1), c]);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setCursor([r, Math.max(0, c - 1)]);
        break;
      case 'ArrowRight':
        e.preventDefault();
        setCursor([r, Math.min(cols - 1, c + 1)]);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (cursor) onActivate(r, c);
        else setCursor([r, c]);
        break;
      case 'Escape':
        setCursor(null);
        break;
    }
  }, [cursor, initial, rows, cols, onActivate]);

  return { cursor, announce, onKeyDown, onFocus, onBlur };
}
