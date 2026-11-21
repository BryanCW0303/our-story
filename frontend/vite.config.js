import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development the React dev server (5173) forwards API and photo requests to Django (8010).
const django = 'http://127.0.0.1:8010'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': django,
      '/media': django,
      '/admin': django,
      '/static': django,
    },
  },
})
