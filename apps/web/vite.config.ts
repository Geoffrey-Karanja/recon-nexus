import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['ownership-says-thick-gathering.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'https://director-uri-land-championships.trycloudflare.com',
        changeOrigin: true,
        secure: true,
      },
      '/ws': {
        target: 'wss://director-uri-land-championships.trycloudflare.com',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
