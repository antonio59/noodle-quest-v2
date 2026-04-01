import type { Track } from '@/types';

export const TRACKS: Track[] = [
  {
    id: 'lofi-chill',
    name: 'Chill Lo-Fi',
    emoji: '☕',
    type: 'lofi',
    bpm: 75,
    description: 'Jazzy chords, vinyl crackle, slow beats',
  },
  {
    id: 'lofi-study',
    name: 'Study Beats',
    emoji: '📚',
    type: 'lofi',
    bpm: 85,
    description: 'Uptempo lo-fi for focused study sessions',
  },
  {
    id: 'focus-deep',
    name: 'Deep Focus',
    emoji: '🧠',
    type: 'focus',
    description: 'Evolving ambient pads for deep concentration',
  },
  {
    id: 'focus-flow',
    name: 'Flow State',
    emoji: '🌊',
    type: 'focus',
    description: 'Gentle tones to maintain flow state',
  },
  {
    id: 'nature-rain',
    name: 'Gentle Rain',
    emoji: '🌧️',
    type: 'nature',
    description: 'Soft filtered noise like distant rainfall',
  },
  {
    id: 'nature-wind',
    name: 'Forest Wind',
    emoji: '🌲',
    type: 'nature',
    description: 'Breezy ambient sounds through trees',
  },
  {
    id: 'meditation-breath',
    name: 'Breathing Guide',
    emoji: '🧘',
    type: 'meditation',
    description: 'Tonal breathing guide — inhale 4s, exhale 4s',
  },
  {
    id: 'meditation-calm',
    name: 'Calm Mind',
    emoji: '☮️',
    type: 'meditation',
    description: 'Slow oscillating tones for mindfulness',
  },
];
