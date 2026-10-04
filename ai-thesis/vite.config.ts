import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

// Browsers can't call these free data sources directly (CORS), so the
// dev/preview server forwards requests to them. No API keys involved.
function forward(prefix: string, target: string, userAgent: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    rewrite: (p) => p.replace(new RegExp(`^${prefix}`), ''),
    headers: { 'User-Agent': userAgent },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // SEC asks automated clients to identify themselves ("Name email@domain").
  // Set SEC_USER_AGENT in ai-thesis/.env.local.
  const secAgent = env.SEC_USER_AGENT || 'ai-thesis-portfolio personal-research@example.com'
  const browserAgent = 'Mozilla/5.0 (ai-thesis-portfolio)'
  const proxy: Record<string, ProxyOptions> = {
    '/api/yahoo': forward('/api/yahoo', 'https://query1.finance.yahoo.com', browserAgent),
    '/api/yfeeds': forward('/api/yfeeds', 'https://feeds.finance.yahoo.com', browserAgent),
    '/api/gnews': forward('/api/gnews', 'https://news.google.com', browserAgent),
    '/api/sec': forward('/api/sec', 'https://www.sec.gov', secAgent),
  }
  return {
    plugins: [react()],
    server: { host: true, port: 5174, proxy },
    preview: { port: 5174, proxy },
  }
})
