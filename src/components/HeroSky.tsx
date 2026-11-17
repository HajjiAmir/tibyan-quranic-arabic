import { useEffect, useRef, useState } from 'react';

/**
 * The night sky behind the landing hero: a faint starfield (layered CSS
 * radial-gradients), a few brighter stars that breathe slowly, one rare
 * shooting star and a softly lit crescent (inline SVG). Purely decorative,
 * behind the content, and still under prefers-reduced-motion (see index.css).
 * In the Day theme the stars are hidden and the crescent stays as a faint daytime moon.
 */
const BRIGHT: { left: string; top: string; size?: 'sm'; delay: string; dur: string }[] = [
  { left: '9%', top: '20%', delay: '0s', dur: '9s' },
  { left: '24%', top: '7%', size: 'sm', delay: '2.2s', dur: '7s' },
  { left: '33%', top: '31%', size: 'sm', delay: '4.1s', dur: '10s' },
  { left: '68%', top: '30%', delay: '1.3s', dur: '11s' },
  { left: '91%', top: '46%', size: 'sm', delay: '3.4s', dur: '8s' },
  { left: '5%', top: '52%', size: 'sm', delay: '5.5s', dur: '9.5s' },
];

export default function HeroSky() {
  // Pause the sky once the hero has scrolled away, so a phone GPU is not kept busy.
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="night-only sky" data-paused={visible ? undefined : ''}>
        <div className="sky-dust absolute inset-0" />
        <div className="sky-twinkle absolute inset-0" />
        <div className="sky-twinkle-b absolute inset-0" />
        {BRIGHT.map((s, i) => (
          <span
            key={s.left + s.top}
            className={`star-bright ${s.size ?? ''} ${i >= 4 ? 'hidden sm:block' : ''}`}
            style={{ left: s.left, top: s.top, animationDelay: s.delay, animationDuration: s.dur }}
          />
        ))}
        <span className="shooting-star" />
      </div>
      <Crescent />
    </div>
  );
}

function Crescent() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="crescent crescent-pos absolute right-[6%] h-10 w-10 sm:right-[10%] sm:h-[4.5rem] sm:w-[4.5rem] lg:right-[12%]"
    >
      <defs>
        <linearGradient id="moonlight" x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="#f7f9ff" />
          <stop offset="0.6" stopColor="#dbe3ff" />
          <stop offset="1" stopColor="#b9c8ff" />
        </linearGradient>
        <mask id="crescent-cut">
          <rect width="100" height="100" fill="#fff" />
          <circle cx="64" cy="38" r="35" fill="#000" />
        </mask>
      </defs>
      <circle cx="50" cy="50" r="38" fill="url(#moonlight)" mask="url(#crescent-cut)" />
    </svg>
  );
}
