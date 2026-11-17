import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
const KEY = 'tibyan.theme';

function stored(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'light' || t === 'dark' || t === 'system') return t;
  } catch {
    /* ignore */
  }
  // Midnight is the flagship: the default until the reader chooses otherwise.
  return 'dark';
}

function apply(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(stored);

  useEffect(() => {
    apply(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // cycle: dark -> light -> system -> dark
  const cycle = () =>
    setTheme((t) => (t === 'dark' ? 'light' : t === 'light' ? 'system' : 'dark'));

  return [theme, cycle];
}
