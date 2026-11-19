/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the project under /oddly-alive/. Override with BASE_PATH.
const base = process.env.BASE_PATH ?? (process.env.GITHUB_ACTIONS ? '/oddly-alive/' : '/');

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: { physics: ['matter-js'] },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
