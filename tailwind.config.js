/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        arabic: ['"Amiri Quran"', '"Scheherazade New"', 'serif'],
        naskh: ['"Scheherazade New"', '"Amiri Quran"', 'serif'],
      },
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-bright': 'rgb(var(--accent-bright) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        emerald: 'rgb(var(--emerald) / <alpha-value>)',
        draft: 'rgb(var(--draft) / <alpha-value>)',
        'draft-bg': 'rgb(var(--draft-bg) / <alpha-value>)',
        'draft-line': 'rgb(var(--draft-line) / <alpha-value>)',
      },
      maxWidth: {
        reading: '46rem',
      },
    },
  },
  plugins: [],
};
