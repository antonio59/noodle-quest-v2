import type { Locale } from '@/data/words/schema';

export const DEFAULT_LOCALE: Locale = 'en-GB';

export function isValidLocale(locale: string): locale is Locale {
  return locale === 'en-GB' || locale === 'en-US';
}

export function normaliseForLocale(input: string, _locale?: Locale): string {
  // TODO(dataset): extend per-locale normalisation rules here
  return input
    .toUpperCase()
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '');
}
