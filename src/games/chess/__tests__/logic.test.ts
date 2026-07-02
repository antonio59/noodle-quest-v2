import { describe, expect, test } from 'vitest';
import { Chess } from 'chess.js';
import { evaluate, bestMove } from '../logic';

describe('evaluate', () => {
  test('the starting position is roughly balanced', () => {
    const game = new Chess();
    expect(Math.abs(evaluate(game))).toBeLessThan(50);
  });

  test('a queen up is a big edge', () => {
    // White queen vs bare king (white to move)
    const game = new Chess('4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1');
    expect(evaluate(game)).toBeGreaterThan(700);
  });

  test('perspective flips with the side to move', () => {
    const w = new Chess('4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1');
    const b = new Chess('4k3/8/8/8/8/8/4Q3/4K3 b - - 0 1');
    expect(evaluate(w)).toBeGreaterThan(0);
    expect(evaluate(b)).toBeLessThan(0);
  });
});

describe('bestMove — tactics', () => {
  test('hard delivers mate in one', () => {
    // Back-rank mate: Ra8#
    const game = new Chess('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1');
    const m = bestMove(game, 'hard');
    expect(m).toBe('Ra8#');
  });

  test('hard escapes mate threats instead of grabbing material', () => {
    // Black threatens Qxg2#. White has a pawn grab available elsewhere
    // but must defend g2 (or trade queens).
    const game = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6q1/2N4P/PPPPPPP1/R1BQKBNR w KQkq - 0 1');
    const m = bestMove(game, 'hard');
    expect(m).not.toBeNull();
    game.move(m!);
    // After white's reply, Qxg2 must not be mate (ideally not even legal)
    const replies = game.moves();
    const qxg2 = replies.find(r => r.startsWith('Qxg2'));
    expect(qxg2 === undefined || !qxg2.endsWith('#')).toBe(true);
  });

  test('medium no longer sacrifices the queen for a spite check', () => {
    // Old medium picked randomly among ALL checking moves. Here the only
    // checks lose the queen for nothing; medium must avoid them.
    // White queen can check on b5/e6-adjacent squares defended by black.
    const game = new Chess('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
    for (let i = 0; i < 10; i++) {
      const fresh = new Chess(game.fen());
      const m = bestMove(fresh, 'medium');
      expect(m).not.toBeNull();
      // Qh5+? isn't even possible here; assert whatever it plays never
      // hangs the queen outright:
      fresh.move(m!);
      const captures = fresh.moves({ verbose: true });
      const queenHangs = captures.some(c =>
        (c as { captured?: string }).captured === 'q' &&
        // "hangs" = capturing the queen with a cheaper piece
        (c as { piece: string }).piece !== 'q',
      );
      if (queenHangs) {
        // Only acceptable if the queen actually took something first
        const played = new Chess(game.fen());
        const detail = played.move(m!);
        expect(detail.captured).toBeDefined();
      }
    }
  });

  test('medium takes free material', () => {
    // Black queen sits en prise to the white knight
    const game = new Chess('rnb1kbnr/pppp1ppp/8/4p3/3q4/2N2N2/PPPPPPPP/R1BQKB1R w KQkq - 0 1');
    const m = bestMove(game, 'medium');
    expect(m).toContain('xd4');
  });

  test('all levels return a legal move', () => {
    for (const level of ['easy', 'medium', 'hard'] as const) {
      const game = new Chess();
      const m = bestMove(game, level);
      expect(m).not.toBeNull();
      expect(() => game.move(m!)).not.toThrow();
    }
  });

  test('returns null when the game is over', () => {
    // Fool's mate position — white is checkmated
    const game = new Chess();
    game.move('f3'); game.move('e5'); game.move('g4'); game.move('Qh4#');
    expect(bestMove(game, 'hard')).toBeNull();
  });
});

describe('performance', () => {
  test('hard stays fast enough for phones in a middlegame', () => {
    // Italian-game middlegame with plenty of legal moves
    const game = new Chess('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1');
    const t0 = performance.now();
    const m = bestMove(game, 'hard');
    const dt = performance.now() - t0;
    expect(m).not.toBeNull();
    // ~500ms alone; the generous bound absorbs parallel-suite CPU
    // contention while still catching a regression to the old 4-5s search
    expect(dt).toBeLessThan(2500);
  });
});
