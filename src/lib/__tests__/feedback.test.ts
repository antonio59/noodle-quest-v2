import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  feedbackEnabled, setFeedbackEnabled,
  playMove, playPlace, playCapture, playDice, playWin, playPerfect, playLose,
  haptic,
} from '../feedback';

const ALL_SOUNDS = [playMove, playPlace, playCapture, playDice, playWin, playPerfect, playLose];

beforeEach(() => {
  localStorage.clear();
});

describe('feedback toggle', () => {
  test('defaults to enabled', () => {
    expect(feedbackEnabled()).toBe(true);
  });

  test('persists on/off through localStorage', () => {
    setFeedbackEnabled(false);
    expect(feedbackEnabled()).toBe(false);
    expect(localStorage.getItem('nq_feedback')).toBe('off');
    setFeedbackEnabled(true);
    expect(feedbackEnabled()).toBe(true);
  });
});

describe('robustness', () => {
  test('every sound no-ops safely without an AudioContext (jsdom)', () => {
    // jsdom has no AudioContext — calls must not throw
    for (const play of ALL_SOUNDS) {
      expect(() => play()).not.toThrow();
    }
  });

  test('haptic no-ops without navigator.vibrate', () => {
    expect(() => haptic(20)).not.toThrow();
    expect(() => haptic([10, 20, 10])).not.toThrow();
  });

  test('haptic calls navigator.vibrate when available and enabled', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    haptic(25);
    expect(vibrate).toHaveBeenCalledWith(25);
    // and respects the toggle
    vibrate.mockClear();
    setFeedbackEnabled(false);
    haptic(25);
    expect(vibrate).not.toHaveBeenCalled();
    Reflect.deleteProperty(navigator as object, 'vibrate');
  });
});
