/**
 * Eight-point star (khatam) lattice: a classical Islamic geometric pattern,
 * drawn as an inline SVG tile in currentColor so it follows the theme.
 * Purely decorative; faded out toward the content by a CSS mask (.hero-motif).
 */
const star = (cx: number, cy: number) => {
  const pts = [
    [0, -15], [4.39, -10.61], [10.61, -10.61], [10.61, -4.39], [15, 0], [10.61, 4.39], [10.61, 10.61], [4.39, 10.61],
    [0, 15], [-4.39, 10.61], [-10.61, 10.61], [-10.61, 4.39], [-15, 0], [-10.61, -4.39], [-10.61, -10.61], [-4.39, -10.61],
  ];
  return pts.map(([x, y]) => `${cx + x},${cy + y}`).join(' ');
};

export default function HeroMotif({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden className={`hero-motif pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <pattern id="khatam" width="56" height="56" patternUnits="userSpaceOnUse" x="50%">
          <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
            {[
              [28, 28],
              [0, 0],
              [56, 0],
              [0, 56],
              [56, 56],
            ].map(([x, y]) => (
              <polygon key={`${x}-${y}`} points={star(x, y)} />
            ))}
            {/* links from the centre star's diagonal tips to the corner stars */}
            <path d="M38.61 17.39 L45.39 10.61 M38.61 38.61 L45.39 45.39 M17.39 38.61 L10.61 45.39 M17.39 17.39 L10.61 10.61" />
            {/* links along the axes between neighbouring stars */}
            <path d="M28 13 L28 0 M28 43 L28 56 M13 28 L0 28 M43 28 L56 28" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#khatam)" />
    </svg>
  );
}
