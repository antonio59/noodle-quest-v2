// Pure Uno rules: deck construction, play legality, scoring, and the AI.
// No React or rendering concerns — unit-testable in isolation.

export const MAX_LOSSES = 3;

export type UnoColor = 'red' | 'blue' | 'green' | 'yellow';
export type UnoSymbol = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw2' | 'wild';
export type UnoCardType = 'number' | 'action' | 'wild' | 'wild4';

export type UnoCard = {
  color: UnoColor | 'wild';
  symbol: UnoSymbol;
  type: UnoCardType;
  id: number;
};

export const COLORS: UnoColor[] = ['red', 'blue', 'green', 'yellow'];
const ACTION_SYMBOLS: UnoSymbol[] = ['skip', 'reverse', 'draw2'];

function makeCardFactory() {
  let id = 0;
  return (color: UnoColor | 'wild', symbol: UnoSymbol, type: UnoCardType): UnoCard => ({
    color, symbol, type, id: id++,
  });
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createDeck(): UnoCard[] {
  const make = makeCardFactory();
  const deck: UnoCard[] = [];
  for (const color of COLORS) {
    deck.push(make(color, '0', 'number'));
    for (let i = 1; i <= 9; i++) {
      deck.push(make(color, String(i) as UnoSymbol, 'number'));
      deck.push(make(color, String(i) as UnoSymbol, 'number'));
    }
    for (const sym of ACTION_SYMBOLS) {
      deck.push(make(color, sym, 'action'));
      deck.push(make(color, sym, 'action'));
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push(make('wild', 'wild', 'wild'));
    deck.push(make('wild', 'wild', 'wild4'));
  }
  return shuffle(deck);
}

export function cardScore(card: UnoCard): number {
  if (card.type === 'wild' || card.type === 'wild4') return 50;
  if (card.type === 'action') return 20;
  return parseInt(card.symbol);
}

export function canPlay(card: UnoCard, topCard: UnoCard, currentColor: UnoColor): boolean {
  if (card.type === 'wild' || card.type === 'wild4') return true;
  if (card.color === currentColor) return true;
  // Don't match on symbol if top card is wild (wild has placeholder symbol)
  if (topCard.type === 'wild' || topCard.type === 'wild4') return false;
  if (card.symbol === topCard.symbol) return true;
  return false;
}

export function handScore(hand: UnoCard[]): number {
  return hand.reduce((sum, c) => sum + cardScore(c), 0);
}

export type AILevel = 'easy' | 'medium' | 'hard';

const AI_CONFIG: Record<AILevel, { wildChance: number; strategicColor: number; actionPriority: number }> = {
  easy: { wildChance: 0.2, strategicColor: 0.2, actionPriority: 0.3 },
  medium: { wildChance: 0.5, strategicColor: 0.6, actionPriority: 0.6 },
  hard: { wildChance: 0.8, strategicColor: 0.9, actionPriority: 0.9 },
};

export function aiSelectCard(hand: UnoCard[], topCard: UnoCard, currentColor: UnoColor, difficulty: AILevel): UnoCard | null {
  const playable = hand.filter(c => canPlay(c, topCard, currentColor));
  if (playable.length === 0) return null;

  const cfg = AI_CONFIG[difficulty];

  if (Math.random() < cfg.actionPriority) {
    const actions = playable.filter(c => c.type === 'action');
    if (actions.length > 0) {
      return actions[Math.floor(Math.random() * actions.length)];
    }
  }

  if (Math.random() < cfg.strategicColor) {
    const colorCounts: Record<string, number> = {};
    for (const c of hand) {
      if (c.color !== 'wild') colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
    }
    const bestColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as UnoColor | undefined;
    if (bestColor) {
      const match = playable.find(c => c.color === bestColor && c.type !== 'wild' && c.type !== 'wild4');
      if (match) return match;
    }
  }

  const nonWild = playable.filter(c => c.type !== 'wild' && c.type !== 'wild4');
  if (nonWild.length > 0 && Math.random() > cfg.wildChance) {
    return nonWild[Math.floor(Math.random() * nonWild.length)];
  }

  return playable[Math.floor(Math.random() * playable.length)];
}

export function aiChooseColor(hand: UnoCard[], difficulty: AILevel): UnoColor {
  const colorCounts: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
  for (const c of hand) {
    if (c.color !== 'wild') colorCounts[c.color]++;
  }

  if (difficulty === 'easy') {
    return COLORS[Math.floor(Math.random() * 4)];
  }

  const best = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] > 0) return best[0] as UnoColor;
  return COLORS[Math.floor(Math.random() * 4)];
}

export type GamePhase = 'playing' | 'choosing-color' | 'round-over' | 'game-over';

export function dealInitial(): { pHand: UnoCard[]; aHand: UnoCard[]; deck: UnoCard[]; discard: UnoCard[]; color: UnoColor } {
  const d = createDeck();
  const pHand = d.slice(0, 7);
  const aHand = d.slice(7, 14);
  let rest = d.slice(14);
  // starter should be a number card to avoid complex wild-start logic
  const starterIdx = rest.findIndex(c => c.type === 'number');
  const starter = starterIdx >= 0 ? rest[starterIdx] : rest[0];
  rest = rest.filter(c => c.id !== starter.id);
  return {
    pHand,
    aHand,
    deck: rest,
    discard: [starter],
    color: starter.color === 'wild' ? COLORS[0] : (starter.color as UnoColor),
  };
}

