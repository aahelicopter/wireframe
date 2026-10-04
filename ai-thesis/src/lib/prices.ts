/**
 * Live quotes from Yahoo Finance's public chart endpoint. No API key needed.
 * Browsers can't call Yahoo directly (CORS), so requests go through the Vite
 * dev/preview server proxy at /api/yahoo (see vite.config.ts).
 *
 * Non-US listings quote in local currency. We convert to USD with Yahoo FX pairs
 * so every value in the app stays in dollars.
 */

export interface Quote {
  symbol: string
  /** Price in the listing's own currency. */
  price: number
  currency: string
  /** Price converted to USD. */
  priceUsd: number
  prevClose: number
  changePct: number
  /** ISO time of the last trade. */
  time: string
}

interface ChartMeta {
  regularMarketPrice?: number
  chartPreviousClose?: number
  previousClose?: number
  currency?: string
  regularMarketTime?: number
  symbol?: string
}

async function fetchMeta(symbol: string, signal?: AbortSignal): Promise<ChartMeta> {
  const res = await fetch(`/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`, { signal })
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`)
  const body = await res.json()
  const meta: ChartMeta | undefined = body?.chart?.result?.[0]?.meta
  if (!meta || typeof meta.regularMarketPrice !== 'number') {
    throw new Error(`${symbol}: ${body?.chart?.error?.description ?? 'no price'}`)
  }
  return meta
}

/** Run tasks with a small concurrency limit so we don't hammer the endpoint. */
async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      try {
        out[i] = { status: 'fulfilled', value: await fn(items[i]) }
      } catch (reason) {
        out[i] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

/**
 * Yahoo quotes a few markets in minor units (GBp = pence, ZAc = cents, ILA = agorot).
 * Returns the major currency and the divisor to get there.
 */
function normalizeCurrency(cur: string): { code: string; div: number } {
  if (cur === 'GBp' || cur === 'GBX') return { code: 'GBP', div: 100 }
  if (cur === 'ZAc') return { code: 'ZAR', div: 100 }
  if (cur === 'ILA') return { code: 'ILS', div: 100 }
  return { code: cur.toUpperCase(), div: 1 }
}

export interface QuoteResult {
  quotes: Record<string, Quote>
  errors: string[]
}

export async function fetchQuotes(symbols: string[], signal?: AbortSignal): Promise<QuoteResult> {
  const unique = [...new Set(symbols.filter(Boolean))]
  const results = await pool(unique, 6, (s) => fetchMeta(s, signal))
  const metas = new Map<string, ChartMeta>()
  const errors: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') metas.set(unique[i], r.value)
    else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason))
  })

  // FX: one pair per non-USD currency, e.g. KRWUSD=X.
  const currencies = new Set<string>()
  for (const m of metas.values()) {
    const { code } = normalizeCurrency(m.currency ?? 'USD')
    if (code !== 'USD') currencies.add(code)
  }
  const fx = new Map<string, number>([['USD', 1]])
  const fxCodes = [...currencies]
  const fxResults = await pool(fxCodes, 6, (c) => fetchMeta(`${c}USD=X`, signal))
  fxResults.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value.regularMarketPrice) fx.set(fxCodes[i], r.value.regularMarketPrice)
    else errors.push(`FX ${fxCodes[i]}→USD unavailable`)
  })

  const quotes: Record<string, Quote> = {}
  for (const [symbol, m] of metas) {
    const { code, div } = normalizeCurrency(m.currency ?? 'USD')
    const rate = fx.get(code)
    if (rate === undefined) continue // can't value it in USD; leave the old price
    const price = m.regularMarketPrice! / div
    const prev = (m.chartPreviousClose ?? m.previousClose ?? m.regularMarketPrice!) / div
    quotes[symbol] = {
      symbol,
      price,
      currency: code,
      priceUsd: price * rate,
      prevClose: prev,
      changePct: prev ? ((price - prev) / prev) * 100 : 0,
      time: new Date((m.regularMarketTime ?? Date.now() / 1000) * 1000).toISOString(),
    }
  }
  return { quotes, errors }
}
