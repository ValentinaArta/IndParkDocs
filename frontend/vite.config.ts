/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/app/',
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    env: {
      NODE_ENV: 'development',
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://127.0.0.1:3002',
      '/maps': 'http://127.0.0.1:3002',
      '/uploads': 'http://127.0.0.1:3002',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
