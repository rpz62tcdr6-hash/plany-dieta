import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ścieżki względne – aplikacja działa także pod adresem GitHub Pages (/apka-plany-dieta/)
  base: './',
})
