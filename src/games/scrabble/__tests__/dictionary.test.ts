import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  DICTIONARIES, parseDictionary, fetchDictionary,
  getPreferredDictionary, setPreferredDictionary, isDictVariant, clearDictionaryCache,
} from '../dictionary';

beforeEach(() => {
  localStorage.clear();
  clearDictionaryCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('preferences', () => {
  test('defaults to UK & International', () => {
    expect(getPreferredDictionary()).toBe('intl');
  });

  test('persists the chosen variant', () => {
    setPreferredDictionary('na');
    expect(getPreferredDictionary()).toBe('na');
    setPreferredDictionary('intl');
    expect(getPreferredDictionary()).toBe('intl');
  });

  test('ignores garbage in storage', () => {
    localStorage.setItem('nq_scrabble_dict', 'klingon');
    expect(getPreferredDictionary()).toBe('intl');
  });

  test('isDictVariant guards untrusted values', () => {
    expect(isDictVariant('intl')).toBe(true);
    expect(isDictVariant('na')).toBe(true);
    expect(isDictVariant('en')).toBe(false);
    expect(isDictVariant(undefined)).toBe(false);
  });
});

describe('parseDictionary', () => {
  test('uppercases, trims, and filters to playable words', () => {
    const set = parseDictionary('cat\r\n  dog  \nA\nsupercalifragilistic\nqi\nna1\n\nZEBRA\n');
    expect(set.has('CAT')).toBe(true);
    expect(set.has('DOG')).toBe(true);
    expect(set.has('QI')).toBe(true);
    expect(set.has('ZEBRA')).toBe(true);
    expect(set.has('A')).toBe(false);                    // 1 letter
    expect(set.has('SUPERCALIFRAGILISTIC')).toBe(false); // > 10 letters
    expect(set.has('NA1')).toBe(false);                  // non-alpha
  });
});

describe('fetchDictionary', () => {
  const letters = (n: number): string => {
    let s = '';
    let x = n;
    do { s = String.fromCharCode(65 + (x % 26)) + s; x = Math.floor(x / 26); } while (x > 0);
    return s;
  };
  const bigList = Array.from({ length: 20000 }, (_, i) => 'W' + letters(i).padStart(4, 'A')).join('\n');

  test('fetches, parses, and caches per variant', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(bigList) });
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchDictionary('na');
    expect(first.size).toBeGreaterThan(10000);
    expect(fetchMock).toHaveBeenCalledWith(DICTIONARIES.na.file);

    // Second call for the same variant hits the cache
    await fetchDictionary('na');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('rejects on HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchDictionary('intl')).rejects.toThrow(/404/);
  });

  test('rejects suspiciously small files instead of using them', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('CAT\nDOG') }));
    await expect(fetchDictionary('intl')).rejects.toThrow(/corrupt/);
  });
});
