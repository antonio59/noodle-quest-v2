export type Locale = 'en-GB' | 'en-US';

export interface WordEntry {
  id: string;
  answer: string;
  normalised: string;
  locale: Locale;
  length: number;
  tags: string[];
  difficulty: 1 | 2 | 3;
  frequency: number;
  banned?: boolean;
  variants?: string[];
}

export interface ClueEntry {
  wordId: string;
  clue: string;
  clueType?: 'definition' | 'cryptic' | 'fill-in';
  locale: string;
  source?: string;
}

export interface WordPack {
  id: string;
  name: string;
  locale: Locale;
  tags: string[];
  words: WordEntry[];
  clues: ClueEntry[];
}
