import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/',
    },
  },
  define: {
    'process.env.API_KEY': JSON.stringify("REMOVED_API_KEY"),
  },
});