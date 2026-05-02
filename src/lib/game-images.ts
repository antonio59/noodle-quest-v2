import anagram from '@/assets/games/anagram.png';
import attentionArchery from '@/assets/games/attention-archery.png';
import breathBubbles from '@/assets/games/breath-bubbles.png';
import colorRush from '@/assets/games/color-rush.png';
import copyCat from '@/assets/games/copy-cat.png';
import dualNBack from '@/assets/games/dual-n-back.png';
import echoTap from '@/assets/games/echo-tap.png';
import emotionVolcano from '@/assets/games/emotion-volcano.png';
import empathyEngine from '@/assets/games/empathy-engine.png';
import feelingsFaces from '@/assets/games/feelings-faces.png';

export const GAME_IMAGES: Record<string, string> = {
  'anagram': anagram,
  'attention-archery': attentionArchery,
  'breath-bubbles': breathBubbles,
  'color-rush': colorRush,
  'copy-cat': copyCat,
  'dual-n-back': dualNBack,
  'echo-tap': echoTap,
  'emotion-volcano': emotionVolcano,
  'empathy-engine': empathyEngine,
  'feelings-faces': feelingsFaces,
};

export function getGameImage(gameId: string): string | undefined {
  return GAME_IMAGES[gameId];
}
