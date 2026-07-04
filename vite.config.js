import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Base path must match the GitHub Pages repo name (project site, not a custom domain).
export default defineConfig({
  base: '/tv-series-tracker/',
  plugins: [react(), tailwindcss()],
})
