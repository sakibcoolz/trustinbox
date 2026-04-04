/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.tsx'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
