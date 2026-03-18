import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Redireciona chamadas /api/* para o backend Next.js (porta 3000)
      // Isso permite que <a href="/api/..."> e <iframe src="/api/..."> funcionem
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
})
