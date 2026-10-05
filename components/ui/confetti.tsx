'use client';

import { useEffect, useMemo, useState } from 'react';

const COLORS = [
  'hsl(var(--foreground))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

/**
 * A short burst that falls once and removes itself. Only ever rendered after a
 * person's own action (finishing a round), so it never runs during SSR.
 * The CSS hides it entirely under prefers-reduced-motion.
 */
export function Confetti({ pieces = 48 }: { pieces?: number }) {
  const [visible, setVisible] = useState(true);

  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        width: 6 + Math.random() * 6,
        height: 8 + Math.random() * 8,
        drift: (Math.random() - 0.5) * 240,
        spin: 360 + Math.random() * 540,
        delay: Math.random() * 0.35,
        duration: 1.9 + Math.random() * 1.1,
        color: COLORS[i % COLORS.length],
      })),
    [pieces],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="confetti" aria-hidden="true">
      {items.map((piece, i) => (
        <span
          key={i}
          style={
            {
              left: `${piece.left}%`,
              width: piece.width,
              height: piece.height,
              background: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              '--drift': `${piece.drift}px`,
              '--spin': `${piece.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
