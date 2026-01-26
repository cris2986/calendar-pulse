import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // PWA options would go here if using vite-plugin-pwa
  // For now, we ensure no service worker interferes in dev
  server: {
    headers: {
      'Cache-Control': 'no-store',
    },
  },
});
