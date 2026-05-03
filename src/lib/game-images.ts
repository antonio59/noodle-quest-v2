import anagram from '@/assets/games/anagram.png';
import attentionArchery from '@/assets/games/attention-archery.png';
import boxBreathing from '@/assets/games/box-breathing.png';
import breathBubbles from '@/assets/games/breath-bubbles.png';
import calmBreathing from '@/assets/games/calm-breathing.png';
import colorRush from '@/assets/games/color-rush.png';
import coherentBreathing from '@/assets/games/coherent-breathing.png';
import copyCat from '@/assets/games/copy-cat.png';
import dualNBack from '@/assets/games/dual-n-back.png';
import echoTap from '@/assets/games/echo-tap.png';
import emotionVolcano from '@/assets/games/emotion-volcano.png';
import empathyEngine from '@/assets/games/empathy-engine.png';
import feelingsFaces from '@/assets/games/feelings-faces.png';
import flexibilityFrames from '@/assets/games/flexibility-frames.png';
import grounding from '@/assets/games/grounding.png';
import justRight from '@/assets/games/just-right.png';
import routineRoadmap from '@/assets/games/routine-roadmap.png';
import squishLab from '@/assets/games/squish-lab.png';
import triangleBreathing from '@/assets/games/triangle-breathing.png';

export const GAME_IMAGES: Record<string, string> = {
  'anagram': anagram,
  'attention-archery': attentionArchery,
  'box-breathing': boxBreathing,
  'breath-bubbles': breathBubbles,
  'calm-breathing': calmBreathing,
  'color-rush': colorRush,
  'coherent-breathing': coherentBreathing,
  'copy-cat': copyCat,
  'dual-n-back': dualNBack,
  'echo-tap': echoTap,
  'emotion-volcano': emotionVolcano,
  'empathy-engine': empathyEngine,
  'feelings-faces': feelingsFaces,
  'flexibility-frames': flexibilityFrames,
  'grounding': grounding,
  'just-right': justRight,
  'routine-roadmap': routineRoadmap,
  'squish-lab': squishLab,
  'triangle-breathing': triangleBreathing,
};

export function getGameImage(gameId: string): string | undefined {
  return GAME_IMAGES[gameId];
}
