import type { Store } from './store'
import type { Order, PlanResult, ScoredHeadline, ThesisProposal } from '../types'
import { currentPeriodStart, marketValue, runPlan } from '../engine/allocate'
import { buildSignals, headlineId, pruneScored } from '../engine/signals'
import { buildOrders, type OrderBuild } from '../engine/orders'
import { gather, googleNews, yahooHeadlines, type Headline } from './news'
import { describeError, scoreHeadlines, type ScoreInput } from './claude'

export type ReviewStep = 'prices' | 'news' | 'ai' | 'plan' | 'done'

export interface ReviewResult {
  newHeadlines: number
  scoredHeadlines: number
  proposals: number
  orders: number
  skipped: OrderBuild['skipped']
  aiError?: string
  aiCostUsd: number
  /** Headlines left for the next review because of the per-call cap. */
  deferred: number
}

const MAX_PER_CALL = 150
const tick = (ms = 120) => new Promise((r) => setTimeout(r, ms))

/** Daily review. Never places or approves trades: orders come out as 'proposed'. */
export async function runReview(store: Store, onStep: (s: ReviewStep) => void): Promise<ReviewResult> {
  onStep('prices')
  await store.refreshPrices()
  await tick()

  let s = store.stateRef.current
  const plan0 = runPlan(s.nodes, s.companies, s.positions, s.settings, buildSignals(s.scored))
  const held = [...new Set(s.positions.map((p) => p.ticker.trim().toUpperCase()).filter(Boolean))]
  const planned = plan0.recommendations.filter((r) => r.targetValue > 0).map((r) => r.ticker)
  const tickers = [...new Set([...held, ...planned])]
  const themes = Object.entries(plan0.nodeAllocation)
    .map(([id, v]) => ({ node: s.nodes.find((n) => n.id === id), v }))
    .filter((x) => x.node?.parentId)
    .sort((a, b) => b.v - a.v)
    .slice(0, 8)
    .map((x) => x.node!)

  // ---- Free news ----
  onStep('news')
  const yahooOf = new Map(s.companies.map((c) => [c.ticker, c.yahoo]))
  const tag = (t: string, f: () => Promise<Headline[]>) => async () => (await f()).map((h) => ({ ...h, tag: t }))
  const { items } = await gather([
    ...tickers.map((t) => tag(t, () => yahooHeadlines(yahooOf.get(t) ?? t))),
    ...themes.map((n) => tag(n.id, () => googleNews(n.newsQuery, 14))),
  ])
  const fresh = items.filter((h) => {
    const id = headlineId(h.url, h.title)
    return !s.scored[id] && !s.seen[id]
  })

  // ---- AI scoring: only headlines never seen before, titles only ----
  const before = s.aiUsage.costUsd
  let scored: Record<string, ScoredHeadline> = { ...s.scored }
  const seen: Record<string, string> = { ...s.seen }
  const proposals: ThesisProposal[] = [...s.proposals]
  let aiError: string | undefined
  let scoredCount = 0
  const batch = fresh.slice(0, MAX_PER_CALL)
  if (s.apiKey && batch.length) {
    onStep('ai')
    const inputs: ScoreInput[] = batch.map((h, n) => ({ n, tag: h.tag ?? '', date: h.date, publisher: h.publisher, title: h.title }))
    const nodeLines = s.nodes
      .filter((n) => n.parentId && n.conviction > 0)
      .map((n) => `${n.id}: ${n.label} [${n.conviction}]`)
      .join('\n')
    const thesis = `${nodeLines}\nHeld: ${held.join(',') || 'none'}\nPlanned: ${planned.join(',')}`
    try {
      const out = await scoreHeadlines(store.ai, thesis, inputs)
      const known = new Set([...s.companies.map((c) => c.ticker), ...held, ...s.nodes.map((n) => n.id)])
      for (const sc of out.scores) {
        const h = batch[sc.n]
        if (!h) continue
        const subject = known.has(sc.subject) ? sc.subject : known.has(sc.subject.toUpperCase()) ? sc.subject.toUpperCase() : h.tag ?? ''
        if (!subject) continue
        const id = headlineId(h.url, h.title)
        scored[id] = { id, title: h.title, url: h.url, publisher: h.publisher, date: h.date || new Date().toISOString(), subject, impact: sc.impact, relevance: sc.relevance, note: sc.note }
        scoredCount++
      }
      for (const h of batch) {
        const id = headlineId(h.url, h.title)
        if (!scored[id]) seen[id] = h.date || new Date().toISOString()
      }
      for (const p of out.proposals) {
        const node = s.nodes.find((n) => n.id === p.nodeId)
        if (!node) continue
        if (proposals.some((x) => x.status === 'pending' && x.nodeId === p.nodeId && x.field === p.field)) continue
        const from = node[p.field]
        const to = Math.min(5, Math.max(p.field === 'conviction' ? 0 : 1, from + p.delta))
        if (to === from) continue
        proposals.push({
          id: `tp_${Date.now().toString(36)}${proposals.length}`,
          createdAt: new Date().toISOString(),
          nodeId: p.nodeId,
          field: p.field,
          from,
          to,
          reason: p.reason,
          evidence: p.evidence.map((n) => batch[n]).filter(Boolean).map((h) => ({ title: h.title, url: h.url })),
          status: 'pending',
        })
      }
    } catch (e) {
      aiError = describeError(e)
    }
  }
  scored = pruneScored(scored)
  const cutoff = new Date(Date.now() - 45 * 86400000).toISOString()
  for (const [k, d] of Object.entries(seen)) if (d < cutoff) delete seen[k]

  // ---- Plan + proposed orders ----
  onStep('plan')
  await tick()
  s = store.stateRef.current // pick up price updates and usage
  const plan = runPlan(s.nodes, s.companies, s.positions, s.settings, buildSignals(scored))
  const kept = s.orders.filter((o) => o.status !== 'proposed')
  const built = buildOrders(plan, s.positions, s.companies, s.quotes, kept, s.trading, currentPeriodStart(s.settings), buildSignals(scored), s.quotesAt)
  const orders = [...kept, ...built.orders]
  const brief = buildBrief(store, plan, orders, scored, proposals, built.skipped)

  store.update({
    scored,
    seen,
    proposals: proposals.filter((p) => p.status === 'pending' || Date.now() - new Date(p.createdAt).getTime() < 30 * 86400000),
    orders,
    review: { ...s.review, lastRunAt: new Date().toISOString(), brief },
  })
  store.requestRun()
  onStep('done')
  return {
    newHeadlines: fresh.length,
    scoredHeadlines: scoredCount,
    proposals: proposals.filter((p) => p.status === 'pending').length,
    orders: built.orders.length,
    skipped: built.skipped,
    aiError,
    aiCostUsd: store.stateRef.current.aiUsage.costUsd - before,
    deferred: Math.max(0, fresh.length - batch.length),
  }
}

const money = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function buildBrief(
  store: Store,
  plan: PlanResult,
  orders: Order[],
  scored: Record<string, ScoredHeadline>,
  proposals: ThesisProposal[],
  skipped: OrderBuild['skipped'],
): string {
  const s = store.stateRef.current
  const today = new Date().toISOString().slice(0, 10)
  const invested = s.positions.reduce((a, p) => a + marketValue(p), 0)
  const L: string[] = []
  L.push(`# AI thesis review, ${today}`, '')
  if (s.trading.halted) L.push(`> **KILL SWITCH ON**${s.trading.haltReason ? `: ${s.trading.haltReason}` : ''}. No orders will be served to the agent.`, '')
  L.push(`Invested ${money(invested)} of ${money(Math.max(s.settings.capital, invested))}. Plan: ${plan.recommendations.filter((r) => r.targetValue > 0).length} names, ${money(plan.totalBuys)} still to deploy.`, '')

  const pending = orders.filter((o) => o.status === 'proposed')
  L.push(`## Orders awaiting approval (${pending.length})`)
  if (pending.length) {
    L.push('| Side | Ticker | Qty | Limit | ≈ $ | Why |', '|---|---|---|---|---|---|')
    for (const o of pending) L.push(`| ${o.side} | ${o.ticker} | ${o.qty} | ${o.orderType === 'market' ? 'mkt, guard ' : ''}${o.limitPrice.toFixed(2)} | ${money(o.notional)} | ${o.reason} |`)
    L.push(`\nTotal buys ${money(pending.filter((o) => o.side === 'BUY').reduce((a, o) => a + o.notional, 0))}, sells ${money(pending.filter((o) => o.side === 'SELL').reduce((a, o) => a + o.notional, 0))}. Approve in the app's Today tab.`)
  } else L.push('None this period.')
  L.push('')

  const approved = orders.filter((o) => o.status === 'approved')
  if (approved.length) {
    L.push(`## Approved, waiting for execution (${approved.length})`)
    for (const o of approved) L.push(`- ${o.side} ${o.qty} ${o.ticker} limit ${o.limitPrice.toFixed(2)} (expires ${o.expiresAt.slice(0, 16).replace('T', ' ')})`)
    L.push('')
  }

  const sig = buildSignals(scored)
  const movers = Object.entries(sig.tickers).filter(([, v]) => Math.abs(v) >= 0.25).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8)
  if (movers.length) {
    L.push('## News signals')
    for (const [t, v] of movers) {
      const top = Object.values(scored).filter((h) => h.subject === t).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))[0]
      L.push(`- ${t} ${v > 0 ? '▲' : '▼'} ${v.toFixed(2)}${top ? `: ${top.note} ([${top.publisher}](${top.url}))` : ''}`)
    }
    L.push('')
  }

  const open = proposals.filter((p) => p.status === 'pending')
  if (open.length) {
    L.push('## Thesis changes suggested by the news')
    for (const p of open) L.push(`- ${s.nodes.find((n) => n.id === p.nodeId)?.label ?? p.nodeId}: ${p.field} ${p.from} → ${p.to}. ${p.reason}`)
    L.push('')
  }
  if (skipped.length) {
    L.push('## Not turned into orders')
    for (const k of skipped) L.push(`- ${k.ticker}: ${k.reason}`)
    L.push('')
  }
  L.push('_Not investment advice. Orders execute only after you approve them._')
  return L.join('\n')
}
