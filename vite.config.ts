import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router'],
          'ui': ['framer-motion', 'lucide-react', 'sonner'],
          'db': ['dexie', 'dexie-react-hooks'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
