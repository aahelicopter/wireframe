import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

// Yahoo Finance blocks browser (CORS) requests, so the dev/preview server
// forwards /api/yahoo/* to it. Used for live quotes.
const proxy: Record<string, ProxyOptions> = {
  '/api/yahoo': {
    target: 'https://query1.finance.yahoo.com',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/api\/yahoo/, ''),
    headers: { 'User-Agent': 'Mozilla/5.0 (ai-thesis-portfolio)' },
  },
}

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5174, proxy },
  preview: { port: 5174, proxy },
})
