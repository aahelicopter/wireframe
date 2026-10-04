/**
 * Free, keyless news sources, fetched through the Vite proxy (vite.config.ts):
 *   - Google News RSS search: any query (thesis themes, company names)
 *   - Yahoo Finance RSS: headlines for a ticker
 *   - SEC EDGAR Atom: 8-K and other filings for US-listed companies
 * Results are cached in localStorage for CACHE_MS so re-opening a card doesn't
 * refetch.
 */

export type NewsSource = 'google' | 'yahoo' | 'sec'

export interface Headline {
  title: string
  url: string
  /** Publisher, e.g. "Reuters" or "SEC". */
  publisher: string
  source: NewsSource
  /** ISO date. */
  date: string
  /** What it was fetched for: a ticker or a thesis label. */
  tag?: string
}

const CACHE_MS = 15 * 60 * 1000
const CACHE_PREFIX = 'ai-thesis-news:'

function readCache(key: string): Headline[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { at, items } = JSON.parse(raw) as { at: number; items: Headline[] }
    return Date.now() - at < CACHE_MS ? items : null
  } catch {
    return null
  }
}

function writeCache(key: string, items: Headline[]) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), items }))
  } catch {
    /* storage full or blocked: skip caching */
  }
}

async function getXml(url: string, signal?: AbortSignal): Promise<Document> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const doc = new DOMParser().parseFromString(await res.text(), 'text/xml')
  if (doc.querySelector('parsererror')) throw new Error('Unreadable feed')
  return doc
}

const text = (el: Element | null | undefined) => el?.textContent?.trim() ?? ''
const isoDate = (s: string) => {
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toISOString()
}

async function cached(key: string, load: () => Promise<Headline[]>): Promise<Headline[]> {
  const hit = readCache(key)
  if (hit) return hit
  const items = await load()
  writeCache(key, items)
  return items
}

/** Google News search. `days` limits to recent articles. */
export function googleNews(query: string, days = 30, signal?: AbortSignal): Promise<Headline[]> {
  const q = `${query} when:${days}d`
  return cached(`g:${q}`, async () => {
    const doc = await getXml(`/api/gnews/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`, signal)
    return [...doc.querySelectorAll('item')].slice(0, 25).map((it) => {
      const publisher = text(it.querySelector('source'))
      // Google appends " - Publisher" to titles.
      let title = text(it.querySelector('title'))
      if (publisher && title.endsWith(` - ${publisher}`)) title = title.slice(0, -publisher.length - 3)
      return { title, url: text(it.querySelector('link')), publisher: publisher || 'Google News', source: 'google' as const, date: isoDate(text(it.querySelector('pubDate'))) }
    })
  })
}

/** Yahoo Finance headlines for one ticker (Yahoo symbol, e.g. LITE or 000660.KS). */
export function yahooHeadlines(symbol: string, signal?: AbortSignal): Promise<Headline[]> {
  return cached(`y:${symbol}`, async () => {
    const doc = await getXml(`/api/yfeeds/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`, signal)
    return [...doc.querySelectorAll('item')].slice(0, 20).map((it) => {
      const url = text(it.querySelector('link'))
      let publisher = 'Yahoo Finance'
      try {
        publisher = new URL(url).hostname.replace(/^www\./, '')
      } catch {
        /* keep default */
      }
      return { title: text(it.querySelector('title')), url, publisher, source: 'yahoo' as const, date: isoDate(text(it.querySelector('pubDate'))) }
    })
  })
}

/** Recent SEC filings (8-K, 10-Q, 10-K, etc.) for a US ticker. */
export function secFilings(ticker: string, signal?: AbortSignal): Promise<Headline[]> {
  return cached(`s:${ticker}`, async () => {
    const doc = await getXml(
      `/api/sec/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(ticker)}&type=&dateb=&owner=include&count=15&output=atom`,
      signal,
    )
    return [...doc.querySelectorAll('entry')].map((e) => {
      const form = e.querySelector('category')?.getAttribute('term') ?? ''
      const title = text(e.querySelector('title')) || form
      return {
        title: title.replace(/\s+/g, ' '),
        url: e.querySelector('link')?.getAttribute('href') ?? '',
        publisher: 'SEC',
        source: 'sec' as const,
        date: isoDate(text(e.querySelector('updated'))),
      }
    })
  })
}

/** Merge, drop duplicates (same title or URL), newest first. */
export function mergeHeadlines(lists: Headline[][]): Headline[] {
  const seen = new Set<string>()
  const out: Headline[] = []
  for (const h of lists.flat()) {
    if (!h.url || !h.title) continue
    const k = h.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80)
    if (seen.has(k) || seen.has(h.url)) continue
    seen.add(k)
    seen.add(h.url)
    out.push(h)
  }
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

/** Run feed loaders together; a failing feed doesn't sink the rest. */
export async function gather(loaders: (() => Promise<Headline[]>)[]): Promise<{ items: Headline[]; failed: number }> {
  const res = await Promise.allSettled(loaders.map((l) => l()))
  const ok = res.filter((r): r is PromiseFulfilledResult<Headline[]> => r.status === 'fulfilled').map((r) => r.value)
  return { items: mergeHeadlines(ok), failed: res.length - ok.length }
}

export function timeAgo(iso: string): string {
  if (!iso) return ''
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const h = Math.round(mins / 60)
  if (h < 48) return `${h}h ago`
  const d = Math.round(h / 24)
  return d < 60 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
