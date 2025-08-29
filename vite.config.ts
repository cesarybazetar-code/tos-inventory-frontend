import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Transpile modern syntax for older Safari
    target: ['es2018', 'safari13']
  }
})
