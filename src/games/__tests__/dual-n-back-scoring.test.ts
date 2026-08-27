import { describe, it, expect } from 'vitest';
import {
  classifyMatch,
  pointsForTrial,
  nForStage,
  starsFromScore,
} from '../dual-n-back-scoring';

describe('dual-n-back scoring', () => {
  it('classifies hits, misses, and false alarms', () => {
    expect(classifyMatch(true, true)).toBe('hit');
    expect(classifyMatch(false, false)).toBe('hit');
    expect(classifyMatch(true, false)).toBe('miss');
    expect(classifyMatch(false, true)).toBe('fa');
  });

  it('scores a perfect dual hit as 16', () => {
    expect(pointsForTrial('hit', 'hit')).toBe(16);
  });

  it('never goes below zero for a bad trial', () => {
    expect(pointsForTrial('fa', 'fa')).toBe(0);
    expect(pointsForTrial('miss', 'miss')).toBe(0);
  });

  it('maps stages to N depth', () => {
    expect(nForStage(1)).toBe(1);
    expect(nForStage(3)).toBe(2);
    expect(nForStage(6)).toBe(3);
  });

  it('awards stars from total score', () => {
    expect(starsFromScore(240, 20)).toBe(3); // 240/320 = 0.75
    expect(starsFromScore(160, 20)).toBe(2);
    expect(starsFromScore(40, 20)).toBe(1);
  });
});
