const PREFIX = 'nq_puzzle_';

interface StoredSession {
  puzzleId: string;
  answers: Record<string, string>;
  foundWords: string[];
  completedAt?: string;
  elapsedMs: number;
}

export function saveSession(gameKey: string, session: StoredSession): void {
  try {
    localStorage.setItem(`${PREFIX}${gameKey}_${session.puzzleId}`, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function loadSession(gameKey: string, puzzleId: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${gameKey}_${puzzleId}`);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}
