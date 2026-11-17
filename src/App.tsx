import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { useTheme } from './lib/theme';
import Home from './pages/Home';
import Reader from './pages/Reader';
import Practice from './pages/Practice';
import Learn from './pages/Learn';
import LearnPractice from './pages/LearnPractice';
import LearnWord from './pages/LearnWord';
import { RootFamily, RootsIndex } from './pages/LearnRoots';

function ThemeButton() {
  const [theme, cycle] = useTheme();
  const label = theme === 'system' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark';

  return (
    <button
      onClick={cycle}
      className="btn btn-sm btn-pill btn-secondary font-medium text-muted hover:text-ink"
      aria-label={`Theme: ${label}`}
      title={`Theme: ${label}`}
    >
      <ThemeIcon theme={theme} />
      {/* On phones the icon alone keeps the header from crowding the wordmark. */}
      <span className="hidden min-[400px]:inline">{label}</span>
    </button>
  );
}

/**
 * Theme icons: one hairline set, drawn in currentColor so they take the button's
 * muted ink in both themes. Same 24-unit grid, size and stroke for all three.
 */
function ThemeIcon({ theme }: { theme: 'light' | 'dark' | 'system' }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {theme === 'dark' && (
        // a thin crescent, lit from the lower left like the hero moon
        <path d="M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5a7.6 7.6 0 1 0 10.1 10.1Z" />
      )}
      {theme === 'light' && (
        <>
          <circle cx="12" cy="12" r="3.6" />
          <path d="M12 3.5v1.6M12 18.9v1.6M3.5 12h1.6M18.9 12h1.6M6 6l1.1 1.1M16.9 16.9 18 18M6 18l1.1-1.1M16.9 7.1 18 6" />
        </>
      )}
      {theme === 'system' && (
        <>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 4.5a7.5 7.5 0 0 0 0 15Z" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

export default function App() {
  const loc = useLocation();
  const onReader = loc.pathname.startsWith('/surah/') || loc.pathname.startsWith('/learn');

  // The fade replays per page, but not between surahs: next/previous keeps the
  // reader mounted, as it was before the fade existed.
  const fadeKey = loc.pathname.replace(/^\/surah\/\d+$/, '/surah');

  // The header is transparent at the top of the page and fades in a veil as the page
  // scrolls. Its scroll state only changes paint (two overlay layers fade their
  // opacity; height, padding and border never change), so it cannot move the
  // layout and re-trigger itself.
  //  - frosted: on past 60px of scroll, off only back under 10px (hysteresis), read
  //    once per animation frame;
  //  - past: driven by an IntersectionObserver on a sentinel at the end of the
  //    landing hero; pages without a hero use the frosted state for it.
  const [frosted, setFrosted] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const y = window.scrollY;
      setFrosted((on) => (on ? y > 10 : y > 60));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [loc.pathname]);
  const [hasHero, setHasHero] = useState(false);
  useEffect(() => {
    const end = document.querySelector('[data-hero-end]');
    setHasHero(!!end);
    setPastHero(false);
    if (!end || !('IntersectionObserver' in window)) return;
    // The sentinel counts as passed once it has gone up behind the header (4rem + inset).
    const io = new IntersectionObserver(
      ([e]) => setPastHero(!e.isIntersecting && e.boundingClientRect.top < window.innerHeight / 2),
      { rootMargin: '-80px 0px 0px 0px' },
    );
    io.observe(end);
    return () => io.disconnect();
  }, [loc.pathname]);
  const headerState = (hasHero ? pastHero : frosted) ? 'past' : frosted ? 'hero' : '';

  // Each page starts at the top (hash routing would otherwise keep the old offset).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [loc.pathname]);

  return (
    <div className="min-h-[100svh]">
      <header
        className="site-header sticky top-0 z-20"
        data-scrolled={headerState || undefined}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="gutter mx-auto flex h-16 max-w-5xl items-center justify-between">
          <Link to="/" className="tap group flex items-center gap-2.5">
            <span className="ar-title text-[1.6rem] leading-none text-accent transition-opacity group-hover:opacity-85">
              تِبيان
            </span>
            <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">Tibyān</span>
            <span className="hidden text-xs text-muted md:inline">· Quranic Arabic</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onReader && (
              <Link to="/" className="btn btn-sm btn-pill btn-secondary font-medium text-muted hover:text-ink">
                ← Surahs
              </Link>
            )}
            {!loc.pathname.startsWith('/learn') && (
              <Link to="/learn" className="btn btn-sm btn-pill btn-secondary">
                Learn
              </Link>
            )}
            <ThemeButton />
          </div>
        </div>
      </header>

      <main className="gutter mx-auto max-w-5xl pt-6 sm:pt-8" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
        <div key={fadeKey} className="route-fade">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/surah/:id" element={<Reader />} />
            <Route path="/surah/:id/practice" element={<Practice />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/practice" element={<LearnPractice />} />
            <Route path="/learn/word/:key" element={<LearnWord />} />
            <Route path="/learn/roots" element={<RootsIndex />} />
            <Route path="/learn/root/:root" element={<RootFamily />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
