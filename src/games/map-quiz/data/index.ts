import { worldDataset } from './world';
import { africaDataset } from './africa';
import { oceaniaDataset } from './oceania';
import { antarcticaDataset } from './antarctica';
import { ukDataset } from './uk';
import type { QuizDataset } from '../types';

export const DATASETS: QuizDataset[] = [
  worldDataset,
  africaDataset,
  oceaniaDataset,
  antarcticaDataset,
  ukDataset,
];

export function getDatasetByStage(stage: number): QuizDataset {
  const idx = Math.max(0, Math.min(stage - 1, DATASETS.length - 1));
  return DATASETS[idx];
}
