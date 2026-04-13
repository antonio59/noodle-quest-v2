import { useState } from 'react';
import type { GameProps } from '@/types';

type UnoColor = 'red' | 'blue' | 'green' | 'yellow';
type UnoSymbol = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw2';
type UnoCardType = 'number' | 'action' | 'wild' | 'wild4';

type UnoCard = {
  color: UnoColor | 'wild';
  symbol: UnoSymbol;
  type: UnoCardType;
  id: number;
};

const COLORS: UnoColor[] = ['red', 'blue', 'green', 'yellow'];
const NUMBER_SYMBOLS: UnoSymbol[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ACTION_SYMBOLS: UnoSymbol[] = ['skip', 'reverse', 'draw2'];

const COLOR_HEX: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  wild: '#1e1e2e',
};

const SYMBOL_DISPLAY: Record<string, string> = {
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  skip: '⊘', reverse: '⟲', draw2: '+2',
};

let nextId = 0;
function makeCard(color: UnoColor | 'wild', symbol: UnoSymbol, type: UnoCardType): UnoCard {
  return { color, symbol, type, id: nextId++ };
}

function createDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  for (const color of COLORS) {
    deck.push(makeCard(color, '0', 'number'));
    for (let i = 1; i <= 9; i++) {
      deck.push(makeCard(color, String(i) as UnoSymbol, 'number'));
      deck.push(makeCard(color, String(i) as UnoSymbol, 'number'));
    }
    for (const sym of ACTION_SYMBOLS) {
      deck.push(makeCard(color, sym, 'action'));
      deck.push(makeCard(color, sym, 'action'));
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push(makeCard('wild', '0', 'wild'));
    deck.push(makeCard('wild', '0', 'wild4'));
  }
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardScore(card: UnoCard): number {
  if (card.type === 'wild') return 50;
  if (card.type === 'wild4') return 50;
  if (card.type === 'action') return 20;
  return parseInt(card.symbol);
}

function canPlay(card: UnoCard, topCard: UnoCard, currentColor: UnoColor): boolean {
  if (card.type === 'wild' || card.type === 'wild4') return true;
  if (card.color === currentColor) return true;
  if (card.symbol === topCard.symbol) return true;
  return false;
}

function handScore(hand: UnoCard[]): number {
  return hand.reduce((sum, c) => sum + cardScore(c), 0);
}

type AILevel = 'easy' | 'medium' | 'hard';

const AI_CONFIG: Record<AILevel, { wildChance: number; strategicColor: number; actionPriority: number }> = {
  easy: { wildChance: 0.2, strategicColor: 0.2, actionPriority: 0.3 },
  medium: { wildChance: 0.5, strategicColor: 0.6, actionPriority: 0.6 },
  hard: { wildChance: 0.8, strategicColor: 0.9, actionPriority: 0.9 },
};

function aiSelectCard(hand: UnoCard[], topCard: UnoCard, currentColor: UnoColor, difficulty: AILevel): UnoCard | null {
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

function aiChooseColor(hand: UnoCard[], difficulty: AILevel): UnoColor {
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

type GamePhase = 'playing' | 'choosing-color' | 'round-over' | 'game-over';

function UnoGame({ stage, onScore, onProgress, onMessage, onEnd, aiDifficulty }: GameProps & { aiDifficulty?: AILevel }) {
  const difficulty: AILevel = aiDifficulty || 'medium';

  const [playerHand, setPlayerHand] = useState<UnoCard[]>(() => {
    const d = createDeck();
    return d.slice(0, 7);
  });
  const [aiHand, setAiHand] = useState<UnoCard[]>(() => {
    const d = createDeck();
    return d.slice(0, 7);
  });
  const [deck, setDeck] = useState<UnoCard[]>(() => {
    const d = createDeck();
    return d.slice(14);
  });
  const [discardPile, setDiscardPile] = useState<UnoCard[]>(() => {
    const d = createDeck();
    const first = d.find(c => c.type === 'number');
    return first ? [first] : [d[0]];
  });
  const [currentColor, setCurrentColor] = useState<UnoColor>('red');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [pendingCard, setPendingCard] = useState<UnoCard | null>(null);
  const [roundWins, setRoundWins] = useState(0);
  const [message, setMessage] = useState('Your turn! Play a card.');
  const [aiThinking, setAiThinking] = useState(false);
  const [lastPlayedBy, setLastPlayedBy] = useState<'player' | 'ai' | null>(null);
  const [highlightCard, setHighlightCard] = useState<number | null>(null);

  const targetWins = Math.min(stage + 1, 10);
  const topCard = discardPile[discardPile.length - 1];

  const drawCards = (currentDeck: UnoCard[], count: number, currentDiscard: UnoCard[] = discardPile): { drawn: UnoCard[]; remaining: UnoCard[] } => {
    if (currentDeck.length < count) {
      const reshuffled = shuffle(currentDiscard.slice(0, -1).concat(currentDeck));
      const drawn = reshuffled.slice(0, count);
      return { drawn, remaining: reshuffled.slice(count) };
    }
    return { drawn: currentDeck.slice(0, count), remaining: currentDeck.slice(count) };
  };

  const handleEndRound = (winner: 'player' | 'ai') => {
    if (winner === 'player') {
      const opponentCards = handScore(aiHand);
      const newWins = roundWins + 1;
      setRoundWins(newWins);
      onScore(opponentCards + 50);
      onProgress(newWins / targetWins);
      setMessage(`You won the round! +${opponentCards + 50} points`);
      onMessage(`Round won! ${newWins}/${targetWins}`);

      if (newWins >= targetWins) {
        setPhase('game-over');
        setTimeout(() => {
          onEnd({ score: newWins * 150, stars: 3, summary: `Won ${newWins} UNO rounds!` });
        }, 1500);
        return;
      }
    } else {
      setMessage('AI won this round. Try again!');
      onMessage('AI won the round');
    }
    setPhase('round-over');
  };

  const applyCardEffect = (card: UnoCard, playedBy: 'player' | 'ai', newDiscard: UnoCard[], newColor: UnoColor, newDeck: UnoCard[], pHand: UnoCard[], aHand: UnoCard[]) => {
    if (card.symbol === 'skip' || card.symbol === 'reverse') {
      if (playedBy === 'player') {
        return { pHand, aHand, deck: newDeck, discard: newDiscard, color: newColor, skip: true, message: `${playedBy === 'player' ? 'AI' : 'You'} got skipped!` };
      } else {
        return { pHand, aHand, deck: newDeck, discard: newDiscard, color: newColor, skip: true, message: `You got skipped!` };
      }
    }

    if (card.symbol === 'draw2') {
      const { drawn, remaining } = drawCards(newDeck, 2, newDiscard);
      if (playedBy === 'player') {
        return { pHand, aHand: [...aHand, ...drawn], deck: remaining, discard: newDiscard, color: newColor, skip: true, message: 'AI draws 2 and is skipped!' };
      } else {
        return { pHand: [...pHand, ...drawn], aHand, deck: remaining, discard: newDiscard, color: newColor, skip: true, message: 'You draw 2 and are skipped!' };
      }
    }

    if (card.type === 'wild4') {
      const { drawn, remaining } = drawCards(newDeck, 4, newDiscard);
      if (playedBy === 'player') {
        return { pHand, aHand: [...aHand, ...drawn], deck: remaining, discard: newDiscard, color: newColor, skip: true, message: 'AI draws 4 and is skipped!' };
      } else {
        return { pHand: [...pHand, ...drawn], aHand, deck: remaining, discard: newDiscard, color: newColor, skip: true, message: 'You draw 4 and are skipped!' };
      }
    }

    return { pHand, aHand, deck: newDeck, discard: newDiscard, color: newColor, skip: false, message: playedBy === 'player' ? 'Your turn!' : 'AI played.' };
  };

  const doAiTurn = (currentDeck: UnoCard[], currentDiscard: UnoCard[], currentColor_: UnoColor, currentAiHand: UnoCard[], currentPlayerHand: UnoCard[]) => {
    setAiThinking(true);
    setMessage('AI is thinking...');

    setTimeout(() => {
      const choice = aiSelectCard(currentAiHand, currentDiscard[currentDiscard.length - 1], currentColor_, difficulty);

      if (!choice) {
        const { drawn, remaining } = drawCards(currentDeck, 1, currentDiscard);
        const newAiHand = [...currentAiHand, ...drawn];
        setAiHand(newAiHand);
        setDeck(remaining);

        const drawnCard = drawn[0];
        if (drawnCard && canPlay(drawnCard, currentDiscard[currentDiscard.length - 1], currentColor_)) {
          const aiHandAfter = newAiHand.filter(c => c.id !== drawnCard.id);
          const newDiscard = [...currentDiscard, drawnCard];
          const newColor = drawnCard.type === 'wild' || drawnCard.type === 'wild4'
            ? aiChooseColor(aiHandAfter, difficulty)
            : drawnCard.color as UnoColor;

          if (aiHandAfter.length === 0) {
            setAiHand(aiHandAfter);
            setDiscardPile(newDiscard);
            setCurrentColor(newColor);
            setDeck(remaining);
            setAiThinking(false);
            handleEndRound('ai');
            return;
          }

          const effect = applyCardEffect(drawnCard, 'ai', newDiscard, newColor, remaining, currentPlayerHand, aiHandAfter);

          setPlayerHand(effect.pHand);
          setAiHand(effect.aHand);
          setDiscardPile(effect.discard);
          setCurrentColor(effect.color);
          setDeck(effect.deck);
          setMessage(effect.message);

          if (effect.skip) {
            setTimeout(() => doAiTurn(effect.deck, effect.discard, effect.color, effect.aHand, effect.pHand), 800);
          } else {
            setIsPlayerTurn(true);
          }
        } else {
          setMessage('AI drew a card. Your turn!');
          setIsPlayerTurn(true);
        }
        setAiThinking(false);
        return;
      }

      const newAiHand = currentAiHand.filter(c => c.id !== choice.id);
      const newDiscard = [...currentDiscard, choice];
      const newColor = choice.type === 'wild' || choice.type === 'wild4'
        ? aiChooseColor(newAiHand, difficulty)
        : choice.color as UnoColor;

      if (newAiHand.length === 0) {
        setAiHand(newAiHand);
        setDiscardPile(newDiscard);
        setCurrentColor(newColor);
        setAiThinking(false);
        handleEndRound('ai');
        return;
      }

      setHighlightCard(choice.id);
      setTimeout(() => setHighlightCard(null), 600);

      const effect = applyCardEffect(choice, 'ai', newDiscard, newColor, currentDeck, currentPlayerHand, newAiHand);

      setPlayerHand(effect.pHand);
      setAiHand(effect.aHand);
      setDiscardPile(effect.discard);
      setCurrentColor(effect.color);
      setDeck(effect.deck);
      setMessage(effect.message);
      setLastPlayedBy('ai');

      if (effect.skip) {
        setTimeout(() => doAiTurn(effect.deck, effect.discard, effect.color, effect.aHand, effect.pHand), 800);
      } else {
        setIsPlayerTurn(true);
      }
      setAiThinking(false);
    }, 600 + Math.random() * 400);
  };

  const handlePlayCard = (card: UnoCard) => {
    if (!isPlayerTurn || phase !== 'playing' || aiThinking) return;
    if (!canPlay(card, topCard, currentColor)) {
      setMessage("Can't play that card!");
      return;
    }

    if (card.type === 'wild' || card.type === 'wild4') {
      setPendingCard(card);
      setPhase('choosing-color');
      setMessage('Choose a color!');
      return;
    }

    playCardWithColor(card, card.color as UnoColor);
  };

  const playCardWithColor = (card: UnoCard, color: UnoColor) => {
    const newPlayerHand = playerHand.filter(c => c.id !== card.id);
    const newDiscard = [...discardPile, card];
    setCurrentColor(color);
    setDiscardPile(newDiscard);
    setPlayerHand(newPlayerHand);
    setPhase('playing');
    setPendingCard(null);
    setLastPlayedBy('player');

    setHighlightCard(card.id);
    setTimeout(() => setHighlightCard(null), 600);

    if (newPlayerHand.length === 0) {
      handleEndRound('player');
      return;
    }

    const effect = applyCardEffect(card, 'player', newDiscard, color, deck, newPlayerHand, aiHand);

    setPlayerHand(effect.pHand);
    setAiHand(effect.aHand);
    setDiscardPile(effect.discard);
    setCurrentColor(effect.color);
    setDeck(effect.deck);
    setMessage(effect.message);

    if (effect.skip) {
      setMessage(effect.message + ' Your turn again!');
      setIsPlayerTurn(true);
    } else {
      setIsPlayerTurn(false);
      doAiTurn(effect.deck, effect.discard, effect.color, effect.aHand, effect.pHand);
    }
  };

  const handleChooseColor = (color: UnoColor) => {
    if (!pendingCard) return;
    playCardWithColor(pendingCard, color);
  };

  const handleDraw = () => {
    if (!isPlayerTurn || phase !== 'playing' || aiThinking) return;

    const { drawn, remaining } = drawCards(deck, 1);
    if (drawn.length === 0) return;

    const newPlayerHand = [...playerHand, drawn[0]];
    setDeck(remaining);
    setPlayerHand(newPlayerHand);
    setMessage(`You drew a card.`);

    const drawnCard = drawn[0];
    if (canPlay(drawnCard, topCard, currentColor)) {
      setMessage(`You drew ${cardLabel(drawnCard)} — you can play it!`);
    } else {
      setMessage('No match. AI\'s turn.');
      setIsPlayerTurn(false);
      doAiTurn(remaining, discardPile, currentColor, aiHand, newPlayerHand);
    }
  };

  const cardLabel = (card: UnoCard): string => {
    if (card.type === 'wild') return 'Wild';
    if (card.type === 'wild4') return 'Wild +4';
    return `${card.color} ${SYMBOL_DISPLAY[card.symbol]}`;
  };

  const startNewRound = () => {
    nextId = 0;
    const newDeck = createDeck();
    const pHand = newDeck.slice(0, 7);
    const aHand = newDeck.slice(7, 14);
    const rest = newDeck.slice(14);
    const starter = rest.find(c => c.type === 'number') || rest[0];
    const afterStarter = rest.filter(c => c.id !== starter.id);

    setPlayerHand(pHand);
    setAiHand(aHand);
    setDeck(afterStarter);
    setDiscardPile([starter]);
    setCurrentColor(starter.color as UnoColor);
    setIsPlayerTurn(true);
    setPhase('playing');
    setPendingCard(null);
    setLastPlayedBy(null);
    setAiThinking(false);
    setMessage('New round! Your turn.');
  };

  const hasPlayableCard = playerHand.some(c => canPlay(c, topCard, currentColor));

  return (
    <div className="h-full flex flex-col items-center justify-between p-2 select-none overflow-hidden">
      <div className="w-full flex justify-between items-center px-2 py-1 text-xs">
        <span className="bg-card rounded-lg px-2 py-1">
          AI: {aiHand.length} card{aiHand.length !== 1 ? 's' : ''}
        </span>
        <span className="bg-card rounded-lg px-2 py-1 text-accent font-bold">
          {roundWins}/{targetWins} wins
        </span>
      </div>

      <div className="flex gap-1 justify-center flex-wrap px-2 py-1 max-h-16 overflow-hidden">
        {aiHand.map((_, i) => (
          <div
            key={i}
            className="w-8 h-12 rounded-md flex items-center justify-center text-white text-[10px] font-bold shadow-md"
            style={{ background: 'linear-gradient(135deg, #2d1b69, #1a1a2e)', border: '1px solid #4a3f8a' }}
          >
            UNO
          </div>
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center gap-6 py-2">
        <button
          onClick={handleDraw}
          disabled={!isPlayerTurn || phase !== 'playing' || aiThinking || hasPlayableCard}
          className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-lg shadow-lg flex flex-col items-center justify-center text-white font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #2d1b69, #1a1a2e)', border: '2px solid #6366f1' }}
        >
          <span className="text-xs opacity-70">DRAW</span>
          <span className="text-sm font-bold">{deck.length}</span>
        </button>

        <div className="flex flex-col items-center gap-1">
          <div
            className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl shadow-xl flex flex-col items-center justify-center text-white font-bold border-4 relative"
            style={{
              background: COLOR_HEX[currentColor],
              borderColor: 'rgba(255,255,255,0.3)',
            }}
          >
            <span className="text-2xl sm:text-3xl drop-shadow-lg">
              {topCard && (topCard.type === 'wild' ? '🌟' : topCard.type === 'wild4' ? '🌟+4' : SYMBOL_DISPLAY[topCard.symbol])}
            </span>
            {topCard && topCard.type !== 'wild' && topCard.type !== 'wild4' && (
              <span className="text-[10px] opacity-80 mt-1">{topCard.color.toUpperCase()}</span>
            )}
          </div>
          <div
            className="w-8 h-8 rounded-full border-2 border-white/30 shadow-md"
            style={{ background: COLOR_HEX[currentColor] }}
          />
        </div>
      </div>

      <div className="text-center text-xs py-1 min-h-[20px]">
        <span className={message.includes('skip') || message.includes('draw') && message.includes('You') ? 'text-danger' : 'text-text-muted'}>
          {message}
        </span>
      </div>

      {phase === 'choosing-color' && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3">
            <span className="text-sm font-bold text-text">Choose a color</span>
            <div className="grid grid-cols-2 gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => handleChooseColor(color)}
                  className="w-16 h-16 rounded-xl font-bold text-white text-sm shadow-lg transition-all hover:scale-110 active:scale-95"
                  style={{ background: COLOR_HEX[color] }}
                >
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center items-end gap-0.5 px-1 pb-4 overflow-x-auto max-h-36 py-2">
        {playerHand.map(card => {
          const playable = isPlayerTurn && phase === 'playing' && canPlay(card, topCard, currentColor);
          const isHighlighted = highlightCard === card.id;
          const isWild = card.type === 'wild' || card.type === 'wild4';

          return (
            <button
              key={card.id}
              onClick={() => handlePlayCard(card)}
              disabled={!playable || aiThinking}
              className="flex-shrink-0 w-12 h-18 sm:w-14 sm:h-20 rounded-lg shadow-md flex flex-col items-center justify-center text-white font-bold transition-all border-2 relative"
              style={{
                background: isWild
                  ? 'linear-gradient(135deg, #ef4444 25%, #3b82f6 25%, #3b82f6 50%, #22c55e 50%, #22c55e 75%, #eab308 75%)'
                  : COLOR_HEX[card.color],
                borderColor: playable ? '#fff' : 'rgba(255,255,255,0.15)',
                opacity: playable ? 1 : 0.6,
                transform: isHighlighted ? 'scale(1.1)' : playable ? 'translateY(-4px)' : 'none',
                cursor: playable ? 'pointer' : 'not-allowed',
              }}
            >
              <span className="text-base sm:text-lg drop-shadow-md leading-none">
                {isWild ? (card.type === 'wild4' ? '+4' : '🌟') : SYMBOL_DISPLAY[card.symbol]}
              </span>
              {!isWild && card.type === 'action' && (
                <span className="text-[8px] opacity-80 mt-0.5">
                  {card.color.slice(0, 3)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!hasPlayableCard && isPlayerTurn && phase === 'playing' && !aiThinking && (
        <button
          onClick={handleDraw}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-accent text-bg font-bold px-4 py-2 rounded-xl text-sm shadow-lg animate-pulse z-40"
        >
          Draw a card
        </button>
      )}

      {phase === 'round-over' && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 max-w-xs">
            <span className="text-2xl">
              {message.includes('You won') ? '🎉' : '😔'}
            </span>
            <span className="text-sm font-bold text-text text-center">{message}</span>
            <button
              onClick={startNewRound}
              className="bg-accent text-bg font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all"
            >
              {roundWins >= targetWins ? 'Finish' : 'Next Round'}
            </button>
          </div>
        </div>
      )}

      {phase === 'game-over' && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 max-w-xs">
            <span className="text-3xl">🏆</span>
            <span className="text-lg font-bold text-accent">
              You won {roundWins} rounds!
            </span>
            <span className="text-sm text-text-muted text-center">
              Great UNO skills!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default UnoGame;
