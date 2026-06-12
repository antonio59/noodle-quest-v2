import { describe, expect, test } from 'vitest';
import {
  COLORS,
  createDeck,
  cardScore,
  canPlay,
  handScore,
  aiSelectCard,
  aiChooseColor,
  dealInitial,
  type UnoCard,
} from '../logic';

let nextId = 0;
const card = (color: UnoCard['color'], symbol: UnoCard['symbol'], type: UnoCard['type'] = 'number'): UnoCard =>
  ({ color, symbol, type, id: nextId++ });

describe('createDeck', () => {
  test('builds the standard 108-card deck (without wild draw 4 it is 100)', () => {
    const deck = createDeck();
    // 19 numbers per color (one 0, two 1-9) + 6 actions per color + 4 wilds + 4 wild4s
    const numbers = deck.filter(c => c.type === 'number');
    const actions = deck.filter(c => c.type === 'action');
    const wilds = deck.filter(c => c.type === 'wild' || c.type === 'wild4');
    expect(numbers).toHaveLength(76);
    expect(actions).toHaveLength(24);
    expect(deck.length).toBe(76 + 24 + wilds.length);
    for (const color of COLORS) {
      expect(deck.filter(c => c.color === color && c.symbol === '0')).toHaveLength(1);
      expect(deck.filter(c => c.color === color && c.symbol === '5')).toHaveLength(2);
    }
  });
});

describe('canPlay', () => {
  const topRed5 = card('red', '5');

  test('matches by color', () => {
    expect(canPlay(card('red', '9'), topRed5, 'red')).toBe(true);
  });

  test('matches by symbol', () => {
    expect(canPlay(card('blue', '5'), topRed5, 'red')).toBe(true);
  });

  test('rejects non-matching card', () => {
    expect(canPlay(card('blue', '9'), topRed5, 'red')).toBe(false);
  });

  test('wilds always play', () => {
    expect(canPlay(card('wild', 'wild', 'wild'), topRed5, 'red')).toBe(true);
  });

  test('matches the chosen color after a wild', () => {
    // top card is a wild, current color chosen as green
    const topWild = card('wild', 'wild', 'wild');
    expect(canPlay(card('green', '2'), topWild, 'green')).toBe(true);
    expect(canPlay(card('red', '2'), topWild, 'green')).toBe(false);
  });
});

describe('scoring', () => {
  test('number cards score face value, actions 20, wilds 50', () => {
    expect(cardScore(card('red', '7'))).toBe(7);
    expect(cardScore(card('red', 'skip', 'action'))).toBe(20);
    expect(cardScore(card('wild', 'wild', 'wild'))).toBe(50);
  });

  test('handScore sums the hand', () => {
    const hand = [card('red', '7'), card('blue', 'draw2', 'action'), card('wild', 'wild', 'wild')];
    expect(handScore(hand)).toBe(77);
  });
});

describe('dealInitial', () => {
  test('deals 7 cards each and a non-wild top card', () => {
    const { pHand, aHand, deck, discard, color } = dealInitial();
    expect(pHand).toHaveLength(7);
    expect(aHand).toHaveLength(7);
    expect(discard).toHaveLength(1);
    expect(discard[0].type).toBe('number');
    expect(COLORS).toContain(color);
    expect(deck.length + pHand.length + aHand.length + discard.length).toBe(createDeck().length);
  });
});

describe('AI', () => {
  test('returns null when no card is playable', () => {
    const hand = [card('blue', '9'), card('green', '2')];
    expect(aiSelectCard(hand, card('red', '5'), 'red', 'hard')).toBeNull();
  });

  test('picks a playable card', () => {
    const hand = [card('blue', '9'), card('red', '2')];
    const pick = aiSelectCard(hand, card('red', '5'), 'red', 'hard');
    expect(pick).not.toBeNull();
    expect(canPlay(pick!, card('red', '5'), 'red')).toBe(true);
  });

  test('aiChooseColor returns a real color', () => {
    const hand = [card('green', '2'), card('green', '7'), card('red', '1')];
    expect(COLORS).toContain(aiChooseColor(hand, 'hard'));
  });
});
