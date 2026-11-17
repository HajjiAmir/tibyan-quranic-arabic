/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Lora', 'Georgia', 'serif'],
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
        gold: 'rgb(var(--gold) / <alpha-value>)',
        'gold-soft': 'rgb(var(--gold-soft) / <alpha-value>)',
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
