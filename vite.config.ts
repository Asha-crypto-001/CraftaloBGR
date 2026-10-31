import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE_PATH ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'craftalo-icon-192.png', 'craftalo-icon-512.png', 'craftalo-logo.png'],
      manifest: {
        name: 'CraftaloBGR - 8K AI Background Remover',
        short_name: 'CraftaloBGR',
        description: 'Remove image backgrounds on your device with CraftaloBGR.',
        theme_color: '#0c0c0c',
        background_color: '#0c0c0c',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}craftalo-icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${base}craftalo-icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://staticimgly.com' &&
              /^\/@imgly\/background-removal-data\/[^/]+\/dist\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'craftalo-model-assets-v1',
              cacheableResponse: {
                statuses: [200],
              },
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      }
    })
  ],
  optimizeDeps: {
    exclude: ['@imgly/background-removal']
  }
})
