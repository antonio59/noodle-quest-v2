import { useMemo } from 'react';

const COLORS = ['#f0a83a', '#f5c542', '#3ecf8e', '#e85d4c', '#38bdf8', '#fb923c'];

interface ConfettiProps {
  /** More pieces for bigger wins. */
  count?: number;
}

/**
 * Lightweight CSS confetti burst for win screens. Pure CSS animation, so
 * the global prefers-reduced-motion rule collapses it automatically for
 * motion-sensitive players. Non-interactive overlay; parent unmounts it
 * with the screen it decorates.
 */
export function Confetti({ count = 36 }: ConfettiProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2 + Math.random() * 1.6,
        size: 6 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        spin: Math.random() < 0.5 ? 1 : -1,
        drift: (Math.random() - 0.5) * 30,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-[-20px] rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.5,
            background: p.color,
            '--confetti-drift': `${p.drift}vw`,
            '--confetti-spin': `${p.spin * 720}deg`,
            animation: `confetti-fall ${p.duration}s cubic-bezier(0.2, 0.4, 0.7, 1) ${p.delay}s forwards`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
