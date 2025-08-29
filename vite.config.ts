import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',             // 👈 critical for Vercel (serve from root)
  build: {
    outDir: 'dist',
    target: ['es2018', 'safari13'],  // keeps your Safari-friendly target
  },
})
