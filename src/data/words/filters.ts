import type { WordEntry, Locale } from './schema';

export function normalise(input: string): string {
  return input
    .toUpperCase()
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '');
}

export function filterByLocale(words: WordEntry[], locale: Locale): WordEntry[] {
  return words.filter(w => w.locale === locale);
}

export function filterByDifficulty(words: WordEntry[], maxDifficulty: number): WordEntry[] {
  return words.filter(w => w.difficulty <= maxDifficulty);
}

export function excludeBanned(words: WordEntry[]): WordEntry[] {
  return words.filter(w => !w.banned);
}

export function allowVariant(word: WordEntry, input: string): boolean {
  const norm = normalise(input);
  if (norm === word.normalised) return true;
  if (word.variants?.some(v => normalise(v) === norm)) return true;
  return false;
}
