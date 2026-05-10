import type { QuizAnswer } from './types';

const PUNCTUATION_RE = /[\p{P}\s]/gu;

export function normalizeInput(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(PUNCTUATION_RE, '')
    .replace(/^the/, '');
}

export function isMatch(input: string, answer: QuizAnswer): boolean {
  const normalized = normalizeInput(input);
  if (!normalized) return false;

  const targets = [answer.label, ...answer.aliases];
  for (const target of targets) {
    if (normalizeInput(target) === normalized) return true;
  }
  return false;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function computeScore(solved: number, total: number, timeRemaining: number, timeLimit: number): number {
  const base = solved * 10;
  const percent = solved / total;
  const accuracyBonus = Math.round(percent * 100);
  const speedBonus = timeLimit > 0 && timeRemaining > 0
    ? Math.round((timeRemaining / timeLimit) * 50)
    : 0;
  return base + accuracyBonus + speedBonus;
}

export function computeStars(solved: number, total: number): number {
  const pct = solved / total;
  if (pct >= 0.85) return 3;
  if (pct >= 0.55) return 2;
  if (pct > 0) return 1;
  return 0;
}
