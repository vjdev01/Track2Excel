import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/Track2Excel/', // <-- Add this line
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Track2Excel',
      short_name: 'Track2Excel',
      start_url: '/Track2Excel/',
      display: 'standalone',
      description: 'A PWA for tracking time and productivity',
      background_color: '#ffffff',
      theme_color: '#1976d2',
      orientation: 'portrait', // Force portrait mode
      scope: '/Track2Excel/', // Ensure scope matches base
      icons: [
        {
          src: 'vite.svg',
          sizes: '192x192',
          type: 'image/svg+xml'
        },
        {
          src: 'vite.svg',
          sizes: '512x512',
          type: 'image/svg+xml'
        }
      ]
    }
  })],
  build: {
    chunkSizeWarningLimit: 1000// Increase warning limit to 1000kB
    }
  }
)
