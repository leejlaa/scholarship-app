import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Dedicated port — avoid 5173 (Vite default); MSAL redirect must match exactly.
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5241',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
