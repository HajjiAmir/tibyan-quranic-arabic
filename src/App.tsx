import { useEffect } from 'react';
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
  const icon = theme === 'light' ? '☀' : theme === 'dark' ? '☾' : '◐';
  return (
    <button
      onClick={cycle}
      className="btn btn-sm btn-pill btn-secondary font-medium text-muted hover:text-ink"
      aria-label={`Theme: ${label}`}
      title={`Theme: ${label}`}
    >
      <span aria-hidden className="text-sm leading-none">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function App() {
  const loc = useLocation();
  const onReader = loc.pathname.startsWith('/surah/') || loc.pathname.startsWith('/learn');

  // The fade replays per page, but not between surahs: next/previous keeps the
  // reader mounted, as it was before the fade existed.
  const fadeKey = loc.pathname.replace(/^\/surah\/\d+$/, '/surah');

  // Each page starts at the top (hash routing would otherwise keep the old offset).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-20 border-b border-line/80 backdrop-blur-md"
        style={{
          background: 'color-mix(in srgb, rgb(var(--paper)) 86%, transparent)',
        }}
      >
        <div className="gutter mx-auto flex h-16 max-w-5xl items-center justify-between">
          <Link to="/" className="tap group flex items-center gap-2.5">
            <span className="ar-title text-[1.6rem] leading-none text-accent transition-opacity group-hover:opacity-85">
              تِبيان
            </span>
            <span className="hidden font-display text-lg font-semibold tracking-tight sm:inline">Tibyān</span>
            <span className="hidden text-xs text-muted md:inline">· Quranic Arabic</span>
          </Link>
          <div className="flex items-center gap-2">
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

      <main className="gutter mx-auto max-w-5xl pb-24 pt-6">
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
