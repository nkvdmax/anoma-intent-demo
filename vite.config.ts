import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/anoma-intent-demo/',   // ✅ важливо для GitHub Pages
  server: { port: 5173 }
})
