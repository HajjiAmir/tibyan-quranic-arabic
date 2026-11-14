import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base + HashRouter so the built site works from any static host
// (GitHub Pages project sites, a subfolder, or opened locally) with no
// server-side routing needed.
export default defineConfig({
  base: './',
  plugins: [react()],
});
