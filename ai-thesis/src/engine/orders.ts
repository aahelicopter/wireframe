import type { Company, Order, PlanResult, Position, Signals, Trading } from '../types'
import type { Quote } from '../lib/prices'
import { marketValue } from './allocate'

const LIVE: Order['status'][] = ['approved', 'sent', 'filled']
/** News signal at or below this pauses new buys of a name. */
export const PAUSE_BELOW = -0.5

/** UUID, so agents can pass it straight through as the broker's idempotency key (Robinhood ref_id). */
const newId = () => crypto.randomUUID()

/** End of the next calendar day, local time. Approved orders not sent by then expire. */
function expiry(now: Date) {
  const d = new Date(now)
  d.setDate(d.getDate() + 1)
  d.setHours(23, 59, 0, 0)
  return d.toISOString()
}

const round2 = (v: number) => Math.round(v * 100) / 100

export interface OrderBuild {
  orders: Order[]
  /** Planned buys we couldn't turn into orders, with why. */
  skipped: { ticker: string; reason: string }[]
}

/**
 * Proposed orders for the current period:
 *  - Buys: this period's tranche, minus whatever was already approved, sent or
 *    filled since the period started, so daily reviews never double-buy.
 *  - Trims: only when "Allow trims" is on (the plan already marks them).
 *  - Exits: holdings whose every thesis node is switched off, if enabled.
 * Nothing here is sent anywhere. Orders start as 'proposed' and need approval.
 */
export function buildOrders(
  plan: PlanResult,
  positions: Position[],
  companies: Company[],
  quotes: Record<string, Quote>,
  existing: Order[],
  trading: Trading,
  /** From currentPeriodStart(): orders since then count against this period's tranche. */
  periodStart: string,
  signals: Signals = { tickers: {}, nodes: {} },
  /** When prices were last fetched. Proposals are not built from stale prices. */
  quotesAt: string | null = null,
  now = new Date(),
): OrderBuild {
  const byTicker = new Map(companies.map((c) => [c.ticker, c]))
  const tranche = plan.tranches[0]
  const already = (ticker: string, side: Order['side']) =>
    existing
      .filter((o) => o.ticker === ticker && o.side === side && LIVE.includes(o.status) && o.createdAt.slice(0, 10) >= periodStart)
      .reduce((a, o) => a + (o.fill ? o.fill.qty * o.fill.avgPrice : o.notional), 0)

  const orders: Order[] = []
  const skipped: OrderBuild['skipped'] = []
  const buffer = trading.limitBufferPct / 100

  if (trading.halted) {
    return { orders, skipped: [{ ticker: 'ALL', reason: `Kill switch is on${trading.haltReason ? ` (${trading.haltReason})` : ''}. No orders proposed.` }] }
  }
  const maxAgeMs = trading.maxQuoteAgeMin * 60000
  if (!quotesAt || now.getTime() - new Date(quotesAt).getTime() > maxAgeMs) {
    return { orders, skipped: [{ ticker: 'ALL', reason: `Prices are older than ${trading.maxQuoteAgeMin} minutes. Refresh prices and re-run the review.` }] }
  }
  // Suggested daily buy budget, counting buys already approved/sent/filled today.
  const today = now.toISOString().slice(0, 10)
  let budgetLeft =
    trading.suggestMaxDailyUsd -
    existing
      .filter((o) => o.side === 'BUY' && LIVE.includes(o.status) && (o.approvedAt ?? o.createdAt).slice(0, 10) === today)
      .reduce((a, o) => a + o.notional, 0)

  const make = (side: Order['side'], ticker: string, dollars: number, kind: Order['kind'], reason: string, maxQty?: number) => {
    const c = byTicker.get(ticker)
    if (c && !c.usListed) return skipped.push({ ticker, reason: 'Non-US listing, not tradable on a US broker. Buy manually or via an ADR.' })
    const q = quotes[ticker]
    if (!q) return skipped.push({ ticker, reason: 'No live price. Refresh prices first.' })
    // A last trade days old means a halt, delisting or bad symbol, not just a weekend.
    if (now.getTime() - new Date(q.time).getTime() > 4 * 86400000) {
      return skipped.push({ ticker, reason: `Last trade ${q.time.slice(0, 10)}. Price looks stale, skipping.` })
    }
    const price = q.priceUsd
    // Robinhood takes up to 6 decimals on fractional (market) orders.
    let qty = trading.fractional ? Math.floor((dollars / price) * 1e6) / 1e6 : Math.floor(dollars / price)
    if (maxQty !== undefined) qty = Math.min(qty, maxQty)
    if (qty <= 0) return skipped.push({ ticker, reason: `Under one share at $${price.toFixed(2)}. Turn on fractional shares.` })
    const notional = round2(qty * price)
    if (notional < trading.minOrderUsd && kind === 'tranche') return skipped.push({ ticker, reason: `Due amount below the $${trading.minOrderUsd} minimum.` })
    orders.push({
      id: newId(),
      createdAt: now.toISOString(),
      side,
      ticker,
      qty,
      notional,
      refPrice: round2(price),
      orderType: trading.fractional && !Number.isInteger(qty) ? 'market' : 'limit',
      limitPrice: round2(side === 'BUY' ? price * (1 + buffer) : price * (1 - buffer)),
      kind,
      reason,
      status: 'proposed',
      expiresAt: expiry(now),
    })
  }

  // Buys from the current tranche.
  for (const b of tranche?.buys ?? []) {
    let due = b.amount - already(b.ticker, 'BUY')
    if (due <= 0) continue
    if (budgetLeft < trading.minOrderUsd) {
      skipped.push({ ticker: b.ticker, reason: `Over today's suggested $${trading.suggestMaxDailyUsd.toLocaleString()} buy budget. It will come up in a later review.` })
      continue
    }
    due = Math.min(due, trading.suggestMaxOrderUsd, budgetLeft)
    // Strongly negative news pauses new buying until the signal fades or you rethink the thesis.
    const sig = signals.tickers[b.ticker] ?? 0
    if (sig <= PAUSE_BELOW) {
      skipped.push({ ticker: b.ticker, reason: `Buying paused: news signal ${sig.toFixed(2)}. Review the headlines on the Today tab.` })
      continue
    }
    const r = plan.recommendations.find((x) => x.ticker === b.ticker)
    const before = orders.length
    make('BUY', b.ticker, due, 'tranche', `Tranche 1 of the plan (${r?.action === 'ADD' ? 'adding to' : 'starting'} a ${r?.targetPct.toFixed(1) ?? '?'}% target)`)
    if (orders.length > before) budgetLeft -= orders[orders.length - 1].notional
  }

  const held = new Map<string, Position>()
  for (const p of positions) {
    const t = p.ticker.trim().toUpperCase()
    if (t) held.set(t, p)
  }

  // Trims (plan only marks them when allowed).
  for (const r of plan.recommendations) {
    if (r.action !== 'TRIM' || already(r.ticker, 'SELL') > 0) continue
    const p = held.get(r.ticker)
    make('SELL', r.ticker, -r.gap, 'trim', `More than 25% over its ${r.targetPct.toFixed(1)}% target`, p?.shares)
  }

  // Exits when the thesis behind a holding is switched off.
  if (trading.exitOnThesisBreak) {
    const active = new Set(plan.ranked.map((s) => s.company.ticker))
    for (const [t, p] of held) {
      if (!byTicker.has(t) || active.has(t) || already(t, 'SELL') > 0) continue
      make('SELL', t, marketValue(p), 'exit', 'Every thesis node this company sits in is switched off', p.shares)
    }
  }
  return { orders, skipped }
}

/** Apply a fill to positions: buys add shares at a blended cost, sells reduce. */
export function applyFill(positions: Position[], o: Order, fill: { qty: number; avgPrice: number }): Position[] {
  const idx = positions.findIndex((p) => p.ticker.trim().toUpperCase() === o.ticker)
  if (o.side === 'BUY') {
    if (idx < 0) {
      return [...positions, { id: `p_${o.id.slice(0, 8)}`, ticker: o.ticker, shares: fill.qty, avgCost: fill.avgPrice, price: fill.avgPrice }]
    }
    return positions.map((p, i) => {
      if (i !== idx) return p
      const shares = p.shares + fill.qty
      return { ...p, shares, avgCost: shares ? (p.shares * p.avgCost + fill.qty * fill.avgPrice) / shares : p.avgCost }
    })
  }
  if (idx < 0) return positions
  return positions
    .map((p, i) => (i === idx ? { ...p, shares: Math.max(0, Math.round((p.shares - fill.qty) * 10000) / 10000) } : p))
    .filter((p) => p.shares > 0 || p.ticker.trim().toUpperCase() !== o.ticker)
}
