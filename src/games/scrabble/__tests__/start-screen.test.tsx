import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { GameProps } from '@/types';
import ScrabbleGame from '@/games/scrabble';
import { clearDictionaryCache } from '@/games/scrabble/dictionary';

const props: GameProps = {
  stage: 1,
  onScore: () => {},
  onProgress: () => {},
  onMessage: () => {},
  onEnd: () => {},
};

const letters = (n: number): string => {
  let s = '';
  let x = n;
  do { s = String.fromCharCode(65 + (x % 26)) + s; x = Math.floor(x / 26); } while (x > 0);
  return s;
};
const bigList = Array.from({ length: 20000 }, (_, i) => 'W' + letters(i).padStart(4, 'A')).join('\n');

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  clearDictionaryCache();
});

describe('scrabble start screen dictionary gating', () => {
  test('Start is disabled until the dictionary downloads, then enabled', async () => {
    let resolveFetch: (r: { ok: boolean; text: () => Promise<string> }) => void;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(res => { resolveFetch = res; })));

    render(<ScrabbleGame {...props} />);

    const loading = screen.getByRole('button', { name: /loading dictionary/i });
    expect(loading).toBeDisabled();

    resolveFetch!({ ok: true, text: () => Promise.resolve(bigList) });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start game/i })).toBeEnabled();
    });
  });

  test('a failed download offers retry instead of silently playing the fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<ScrabbleGame {...props} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /^start game$/i })).not.toBeInTheDocument();
    // The explicit last-resort option is present and labelled honestly
    expect(screen.getByRole('button', { name: /use basic list/i })).toBeInTheDocument();
  });

  test('offers both dictionary variants with UK/International selected by default', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(bigList) }));
    render(<ScrabbleGame {...props} />);

    const uk = screen.getByRole('radio', { name: /uk & international/i });
    const na = screen.getByRole('radio', { name: /us & canada/i });
    expect(uk).toHaveAttribute('aria-checked', 'true');
    expect(na).toHaveAttribute('aria-checked', 'false');
  });
});
