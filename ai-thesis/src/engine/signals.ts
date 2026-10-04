import type { ScoredHeadline, Signals } from '../types'

const HALF_LIFE_DAYS = 7
const WINDOW_DAYS = 45

/**
 * Turn scored headlines into a -1..1 signal per ticker and per node.
 * Each headline counts impact × relevance, decayed with a 7-day half-life, so
 * one strong story fades in a few weeks unless the news keeps confirming it.
 */
export function buildSignals(scored: Record<string, ScoredHeadline>, now = Date.now()): Signals {
  const sums: Record<string, number> = {}
  for (const h of Object.values(scored)) {
    const ageDays = h.date ? (now - new Date(h.date).getTime()) / 86400000 : 0
    if (ageDays > WINDOW_DAYS) continue
    const w = Math.pow(0.5, Math.max(0, ageDays) / HALF_LIFE_DAYS)
    sums[h.subject] = (sums[h.subject] ?? 0) + h.impact * (h.relevance / 3) * w
  }
  const tickers: Record<string, number> = {}
  const nodes: Record<string, number> = {}
  for (const [subject, v] of Object.entries(sums)) {
    // Squash: about 3 strong, fresh, same-direction stories ≈ ±0.9.
    const s = Math.tanh(v / 3)
    if (/^[a-z0-9-]+$/.test(subject)) nodes[subject] = s
    else tickers[subject] = s
  }
  return { tickers, nodes }
}

/** Drop scored headlines that are too old to matter, to keep storage small. */
export function pruneScored(scored: Record<string, ScoredHeadline>, now = Date.now()) {
  const out: Record<string, ScoredHeadline> = {}
  for (const [k, h] of Object.entries(scored)) {
    if (!h.date || now - new Date(h.date).getTime() < WINDOW_DAYS * 86400000) out[k] = h
  }
  return out
}

/** Stable short id for a headline, so it is only ever scored once. */
export function headlineId(url: string, title: string) {
  let h = 2166136261
  const s = url || title
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}
