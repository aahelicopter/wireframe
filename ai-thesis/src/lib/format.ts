import type { ThesisNode } from '../types'

export const usd = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const usdK = (v: number) => {
  const a = Math.abs(v)
  if (a >= 1_000_000) return `${v < 0 ? '-' : ''}$${(a / 1_000_000).toFixed(2)}M`
  if (a >= 1000) return `${v < 0 ? '-' : ''}$${(a / 1000).toFixed(a >= 100_000 ? 0 : 1)}k`
  return usd(v)
}

export const pct = (v: number, d = 1) => `${v.toFixed(d)}%`

export const newsUrl = (q: string) =>
  `https://news.google.com/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`

export const quoteUrl = (yahoo: string) => `https://finance.yahoo.com/quote/${encodeURIComponent(yahoo)}`

export const filingsUrl = (ticker: string) =>
  `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(ticker)}&type=&dateb=&owner=include&count=40`

/** Fixed categorical order by top-level branch, so a branch keeps its color. */
const SLOTS = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s7', '--s8']
export function branchColors(nodes: ThesisNode[]): Record<string, string> {
  const root = nodes.find((n) => n.parentId === null)
  const branches = nodes.filter((n) => root && n.parentId === root.id)
  const out: Record<string, string> = {}
  branches.forEach((b, i) => {
    out[b.id] = i < SLOTS.length ? `var(${SLOTS[i]})` : 'var(--muted)'
  })
  if (root) out[root.id] = 'var(--text-2)'
  return out
}

export const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 32) || 'node'
