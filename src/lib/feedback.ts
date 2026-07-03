// Game-feel feedback: short synthesized sound effects (Web Audio, no
// audio files — same approach as the music engine) plus haptics, behind
// a single persisted toggle.
//
// Every function is safe to call anywhere: missing AudioContext,
// autoplay restrictions, or navigator.vibrate absence all no-op quietly.

const STORAGE_KEY = 'nq_feedback';

let ctx: AudioContext | null = null;

export function feedbackEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setFeedbackEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // storage unavailable — session-only behavior is fine
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

interface ToneSpec {
  freq: number;
  /** seconds from now */
  at?: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  /** linear frequency glide target */
  glideTo?: number;
}

function tone(spec: ToneSpec): void {
  if (!feedbackEnabled()) return;
  try {
    const ac = getCtx();
    if (!ac) return;
    const { freq, at = 0, duration = 0.12, type = 'sine', volume = 0.08, glideTo } = spec;
    const t0 = ac.currentTime + at;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.linearRampToValueAtTime(glideTo, t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch {
    // audio unavailable — stay silent
  }
}

export function haptic(pattern: number | number[]): void {
  if (!feedbackEnabled()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // not supported — fine
  }
}

// ── Game sounds ────────────────────────────────────────────────────────

/** Placing a piece / making a quiet move. */
export function playMove(): void {
  tone({ freq: 520, duration: 0.06, type: 'triangle', volume: 0.06 });
  haptic(8);
}

/** Dropping a disc / a heavier placement. */
export function playPlace(): void {
  tone({ freq: 300, duration: 0.1, type: 'triangle', volume: 0.08, glideTo: 180 });
  haptic(10);
}

/** Capturing an opponent piece. */
export function playCapture(): void {
  tone({ freq: 660, duration: 0.07, type: 'square', volume: 0.05 });
  tone({ freq: 330, at: 0.06, duration: 0.12, type: 'square', volume: 0.06, glideTo: 220 });
  haptic([12, 30, 18]);
}

/** Rolling dice. */
export function playDice(): void {
  for (let i = 0; i < 4; i++) {
    tone({ freq: 900 + Math.random() * 500, at: i * 0.045, duration: 0.03, type: 'square', volume: 0.03 });
  }
  haptic([8, 20, 8]);
}

/** Stage cleared (2 stars). */
export function playWin(): void {
  const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
  notes.forEach((f, i) => tone({ freq: f, at: i * 0.11, duration: 0.22, type: 'triangle', volume: 0.09 }));
  haptic([25, 40, 25]);
}

/** Perfect run (3 stars). */
export function playPerfect(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => tone({ freq: f, at: i * 0.1, duration: 0.26, type: 'triangle', volume: 0.1 }));
  tone({ freq: 1568, at: 0.4, duration: 0.4, type: 'sine', volume: 0.05 });
  haptic([30, 40, 30, 40, 60]);
}

/** Round lost — gentle, not punishing. */
export function playLose(): void {
  tone({ freq: 392, duration: 0.18, type: 'sine', volume: 0.06 });
  tone({ freq: 311, at: 0.15, duration: 0.28, type: 'sine', volume: 0.06 });
}
