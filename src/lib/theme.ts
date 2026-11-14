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
  return 'system';
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

  // cycle: system -> light -> dark -> system
  const cycle = () =>
    setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system'));

  return [theme, cycle];
}
