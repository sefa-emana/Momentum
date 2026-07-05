import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages project site is served from /<repo>/.
// Allow override via BASE_PATH for local/preview or custom domains.
const base = process.env.BASE_PATH ?? '/Momentum/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Momentum — Sport Tracker',
        short_name: 'Momentum',
        description:
          'Evidenzbasierter, gamifizierter Sport-Tracker: sammle XP, halte deine Streak und bewahre dein Momentum.',
        theme_color: '#f7f7f9',
        background_color: '#f7f7f9',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        shortcuts: [
          {
            name: 'Training loggen',
            short_name: 'Loggen',
            description: 'Eine Einheit direkt eintragen',
            url: `${base}?action=log`,
          },
        ],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/state/**'],
      reporter: ['text', 'html'],
    },
  },
})
