import { describe, it, expect } from 'vitest';
import { filterByLocale, filterByDifficulty, excludeBanned, allowVariant, normalise } from '@/data/words/filters';
import type { WordEntry } from '@/data/words/schema';

const words: WordEntry[] = [
  { id: '1', answer: 'COLOUR', normalised: 'COLOUR', locale: 'en-GB', length: 6, tags: [], difficulty: 1, frequency: 500, banned: false, variants: ['COLOR'] },
  { id: '2', answer: 'COLOR', normalised: 'COLOR', locale: 'en-US', length: 5, tags: [], difficulty: 1, frequency: 500, banned: false },
  { id: '3', answer: 'BAD', normalised: 'BAD', locale: 'en-GB', length: 3, tags: [], difficulty: 1, frequency: 500, banned: true },
];

describe('filters', () => {
  it('filterByLocale', () => {
    expect(filterByLocale(words, 'en-GB').map(w => w.answer)).toEqual(['COLOUR', 'BAD']);
  });

  it('filterByDifficulty', () => {
    expect(filterByDifficulty(words, 1).map(w => w.answer)).toEqual(['COLOUR', 'COLOR', 'BAD']);
  });

  it('excludeBanned', () => {
    expect(excludeBanned(words).map(w => w.answer)).toEqual(['COLOUR', 'COLOR']);
  });

  it('normalise', () => {
    expect(normalise('COLOUR')).toBe('COLOUR');
    expect(normalise('Neighbour')).toBe('NEIGHBOUR');
  });

  it('allowVariant should accept variant spellings', () => {
    expect(allowVariant(words[0], 'COLOR')).toBe(true);
    expect(allowVariant(words[0], 'COLOUR')).toBe(true);
    expect(allowVariant(words[0], 'RED')).toBe(false);
  });
});
