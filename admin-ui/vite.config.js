import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // dev proxy so the SPA can call the backend on port 3001
    proxy: {
      '/api': 'http://localhost:3001',
      '/postiz': 'http://localhost:3001',
    },
  },
})
