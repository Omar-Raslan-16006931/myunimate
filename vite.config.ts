import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      workbox: {
          maximumFileSizeToCacheInBytes: 4000000 
      },
      manifest: {
        name: 'UniMate',
        short_name: 'UniMate',
        description: 'University Operating System',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/',
    },
  },
  // NOTE: Gemini API key has been moved to backend-only endpoints
  // Frontend no longer has direct access to API credentials
  // All AI features now go through secure backend endpoints
});