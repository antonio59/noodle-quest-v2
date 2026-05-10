import type { QuizDataset } from '../types';
import { OceaniaMap } from '../maps';

function a(id: string, label: string, x: number, y: number, ...aliases: string[]) {
  return { id, label, aliases, x, y };
}

export const oceaniaDataset: QuizDataset = {
  id: 'oceania',
  title: 'Countries of Oceania',
  emoji: '🌏',
  description: 'Can you name all 14 Oceania countries?',
  mapComponent: OceaniaMap,
  timeLimit: 5 * 60,
  answers: [
    a('au', 'Australia', 30, 28),
    a('pg', 'Papua New Guinea', 40, 12, 'png'),
    a('nz', 'New Zealand', 52, 32),
    a('fj', 'Fiji', 58, 22),
    a('sb', 'Solomon Islands', 48, 16, 'solomons'),
    a('vu', 'Vanuatu', 52, 20),
    a('ws', 'Samoa', 68, 20),
    a('to', 'Tonga', 70, 26),
    a('ki', 'Kiribati', 75, 10),
    a('tv', 'Tuvalu', 62, 16),
    a('nr', 'Nauru', 58, 12),
    a('pw', 'Palau', 58, 8),
    a('fm', 'Micronesia', 68, 6, 'federated states of micronesia', 'fsm'),
    a('mh', 'Marshall Islands', 72, 4),
  ],
};
