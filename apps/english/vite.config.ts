import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: '/Tudy/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@stdylang/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 4100,
    strictPort: true,
    hmr: { port: 4100 },
  },
})
