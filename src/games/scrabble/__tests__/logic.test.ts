import { describe, expect, test } from 'vitest';
import {
  TILE_SCORES,
  TILE_COUNTS,
  SIZE,
  CENTER,
  BONUS_MAP,
  buildTilePool,
  findAnchors,
  scorePlacement,
  validateAndScoreCrossWords,
  generateAiMoves,
  pickAiMove,
  buildScoreBreakdown,
  type Placement,
} from '../logic';

function emptyBoard(): (string | null)[][] {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null));
}

describe('tile data', () => {
  test('standard 100-tile distribution (minus blanks)', () => {
    const total = Object.values(TILE_COUNTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(98); // 100 standard tiles minus the 2 blanks
    expect(TILE_SCORES.Q).toBe(10);
    expect(TILE_SCORES.E).toBe(1);
  });

  test('buildTilePool shuffles the full distribution', () => {
    const pool = buildTilePool();
    expect(pool).toHaveLength(98);
    const es = pool.filter(l => l === 'E');
    expect(es).toHaveLength(12);
  });
});

describe('board layout', () => {
  test('center is a star square and corners are triple word', () => {
    expect(BONUS_MAP.get(`${CENTER},${CENTER}`)).toBe('ST');
    expect(BONUS_MAP.get('0,0')).toBe('TW');
    expect(BONUS_MAP.get('0,14')).toBe('TW');
    expect(BONUS_MAP.get('14,0')).toBe('TW');
    expect(BONUS_MAP.get('14,14')).toBe('TW');
  });
});

describe('findAnchors', () => {
  test('empty board anchors at center', () => {
    expect(findAnchors(emptyBoard())).toEqual([[CENTER, CENTER]]);
  });

  test('non-empty board anchors adjacent to tiles', () => {
    const board = emptyBoard();
    board[7][7] = 'A';
    const anchors = findAnchors(board);
    expect(anchors).toContainEqual([6, 7]);
    expect(anchors).toContainEqual([8, 7]);
    expect(anchors).toContainEqual([7, 6]);
    expect(anchors).toContainEqual([7, 8]);
    expect(anchors).not.toContainEqual([7, 7]);
  });
});

describe('scorePlacement', () => {
  test('plain letters sum without bonuses', () => {
    const board = emptyBoard();
    // Row 7: C(3) A(1) T(1) at cols 6-8; col 7 is the star (×3 word)
    board[7][6] = 'C'; board[7][7] = 'A'; board[7][8] = 'T';
    const cells: [number, number][] = [[7, 6], [7, 7], [7, 8]];
    const newSet = new Set(cells.map(([r, c]) => `${r},${c}`));
    // star square triples the word: (3+1+1) * 3 = 15
    expect(scorePlacement(board, cells, newSet)).toBe(15);
  });

  test('bonuses only apply to newly placed tiles', () => {
    const board = emptyBoard();
    board[7][6] = 'C'; board[7][7] = 'A'; board[7][8] = 'T';
    const cells: [number, number][] = [[7, 6], [7, 7], [7, 8]];
    // Nothing new — star multiplier must not fire
    expect(scorePlacement(board, cells, new Set())).toBe(5);
  });
});

describe('validateAndScoreCrossWords', () => {
  test('rejects placements forming invalid cross-words', () => {
    const board = emptyBoard();
    board[7][7] = 'Q'; // lone Q on board
    // Placing 'X' below the Q forms vertical "QX" (invalid)
    const res = validateAndScoreCrossWords(board, [{ r: 8, c: 7, letter: 'X' }], 'H');
    expect(res).toBe(-1);
  });

  test('scores a valid cross-word', () => {
    const board = emptyBoard();
    board[7][7] = 'T'; // existing T
    // placing 'O' under it forms "TO" (valid): T(1) + O(1) = 2
    const res = validateAndScoreCrossWords(board, [{ r: 8, c: 7, letter: 'O' }], 'H');
    expect(res).toBe(2);
  });
});

describe('generateAiMoves', () => {
  test('first move covers the center star', () => {
    const moves = generateAiMoves(emptyBoard(), ['C', 'A', 'T', 'S', 'E', 'R', 'D'], true);
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) {
      expect(m.cells.some(([r, c]) => r === CENTER && c === CENTER)).toBe(true);
      expect(m.newCells.length).toBeGreaterThan(0);
    }
  });

  test('subsequent moves connect to existing tiles', () => {
    const board = emptyBoard();
    board[7][6] = 'C'; board[7][7] = 'A'; board[7][8] = 'T';
    const moves = generateAiMoves(board, ['S', 'E', 'R', 'D', 'O', 'L', 'I'], false);
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) {
      expect(m.newCells.length).toBeGreaterThan(0);
      expect(m.newCells.length).toBeLessThanOrEqual(7);
    }
  });
});

describe('pickAiMove', () => {
  const moves: Placement[] = [
    { word: 'LOW', cells: [], newCells: [], score: 5 },
    { word: 'MID', cells: [], newCells: [], score: 10 },
    { word: 'TOP', cells: [], newCells: [], score: 20 },
  ];

  test('hard always takes the best move', () => {
    expect(pickAiMove(moves, 'hard')!.word).toBe('TOP');
  });

  test('returns null with no moves', () => {
    expect(pickAiMove([], 'easy')).toBeNull();
  });

  test('easy picks from the bottom third', () => {
    for (let i = 0; i < 20; i++) {
      const pick = pickAiMove(moves, 'easy')!;
      expect(pick.word).toBe('LOW');
    }
  });
});

describe('buildScoreBreakdown', () => {
  test('totals main + cross + bingo', () => {
    const board = emptyBoard();
    board[7][6] = 'C'; board[7][7] = 'A'; board[7][8] = 'T';
    const cells: [number, number][] = [[7, 6], [7, 7], [7, 8]];
    const newSet = new Set(cells.map(([r, c]) => `${r},${c}`));
    const bd = buildScoreBreakdown(board, cells, newSet, 4, 50);
    expect(bd.word).toBe('CAT');
    expect(bd.mainWordScore).toBe(15); // star ×3
    expect(bd.crossWordsScore).toBe(4);
    expect(bd.bingoBonus).toBe(50);
    expect(bd.total).toBe(69);
  });
});
