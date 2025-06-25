import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1000kB
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor_recharts';
            if (id.includes('react-icons')) return 'vendor_icons';
            if (id.includes('react')) return 'vendor_react';
            return 'vendor';
          }
        }
      }
    }
  }
})
