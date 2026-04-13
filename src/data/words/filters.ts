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

export function filterByTags(words: WordEntry[], tags: string[]): WordEntry[] {
  if (tags.length === 0) return words;
  return words.filter(w => tags.some(t => w.tags.includes(t)));
}

export function excludeBanned(words: WordEntry[]): WordEntry[] {
  return words.filter(w => !w.banned);
}

export function deduplicateByNormalised(words: WordEntry[]): WordEntry[] {
  const seen = new Set<string>();
  return words.filter(w => {
    if (seen.has(w.normalised)) return false;
    seen.add(w.normalised);
    return true;
  });
}

export function sortByQuality(words: WordEntry[]): WordEntry[] {
  return [...words].sort((a, b) => {
    // Prefer longer words with higher frequency
    const scoreA = a.frequency + a.length * 50;
    const scoreB = b.frequency + b.length * 50;
    return scoreB - scoreA;
  });
}

export function allowVariant(word: WordEntry, input: string): boolean {
  const norm = normalise(input);
  if (norm === word.normalised) return true;
  if (word.variants?.some(v => normalise(v) === norm)) return true;
  return false;
}
