import type {
  Company,
  FactorKey,
  PlanResult,
  Position,
  Recommendation,
  ScoredCompany,
  Settings,
  Signals,
  ThesisNode,
  Timing,
  Tranche,
} from '../types'
import { branchOf, indexTree, pathTo, type TreeIndex } from './tree'

export const FACTOR_LABELS: Record<FactorKey, { label: string; hint: string }> = {
  conviction: { label: 'Thesis conviction', hint: 'Your conviction on the nodes the company sits in' },
  bottleneck: { label: 'Bottleneck / scarcity', hint: 'Favor supply-constrained layers with pricing power' },
  beta: { label: 'High beta', hint: 'Favor names that move more than the market' },
  depth: { label: 'Depth down the stack', hint: 'Favor picks 2+ levels below the GPU' },
  purity: { label: 'AI purity', hint: 'Share of the business tied to the AI buildout' },
  smallCap: { label: 'Small-cap tilt', hint: 'Favor smaller, less-owned names' },
  catalyst: { label: 'Near-term catalyst', hint: 'Favor theses expected to show up in numbers soon' },
  news: { label: 'News flow', hint: 'Favor names and layers with supportive recent news (needs a daily review with AI scoring)' },
}

const CAP_SCORE = { mega: 0, large: 0.33, mid: 0.67, small: 1 } as const
const TIMING_SCORE: Record<Timing, number> = { now: 1, '6-12m': 0.65, '12-24m': 0.35 }

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))

export function marketValue(p: Position): number {
  return p.shares * (p.price || p.avgCost || 0)
}

export function scoreCompanies(
  companies: Company[],
  idx: TreeIndex,
  settings: Settings,
  heldTickers: Set<string>,
  signals: Signals = { tickers: {}, nodes: {} },
): ScoredCompany[] {
  const w = settings.weights
  const wSum = Object.values(w).reduce((a, b) => a + b, 0) || 1
  const maxDepth = Math.max(1, idx.maxDepth)
  const out: ScoredCompany[] = []

  for (const c of companies) {
    if (settings.usOnly && !c.usListed) continue
    const active = c.exposures.filter((e) => idx.byId.has(e.nodeId) && idx.active.get(e.nodeId))
    if (!active.length) continue

    // The first listed exposure is the company's home node; fall back down the list
    // when that node is switched off.
    const primary = active[0]
    const nodes = active.map((e) => idx.byId.get(e.nodeId)!)
    const maxConv = Math.max(...nodes.map((n) => n.conviction))
    const maxScar = Math.max(...nodes.map((n) => n.scarcity))
    const maxD = Math.max(...nodes.map((n) => idx.depth.get(n.id) ?? 0))
    const bestTiming = Math.max(...nodes.map((n) => TIMING_SCORE[n.timing]))

    const factors: Record<FactorKey, number> = {
      conviction: clamp(maxConv / 5 + 0.04 * (active.length - 1)),
      bottleneck: maxScar / 5,
      beta: clamp((c.beta - 0.8) / 2.2),
      depth: maxD / maxDepth,
      purity: clamp(c.purity),
      smallCap: CAP_SCORE[c.cap],
      catalyst: bestTiming,
      news: newsFactor(c.ticker, active.map((e) => e.nodeId), signals),
    }
    let composite = 0
    for (const k of Object.keys(factors) as FactorKey[]) composite += w[k] * factors[k]
    composite /= wSum
    // Conviction also gates the score so turning a node down really matters.
    let score = composite * (0.4 + 0.6 * (maxConv / 5))
    if (settings.favorHoldings && heldTickers.has(c.ticker)) score *= 1.15

    out.push({
      company: c,
      score,
      factors,
      primaryNodeId: primary.nodeId,
      branchId: branchOf(idx, primary.nodeId),
      activeExposures: active,
    })
  }
  return out.sort((a, b) => b.score - a.score)
}

/** Proportional weights with per-name and per-branch caps (water-filling). */
function capWeights(
  raw: Map<string, number>,
  branchOfTicker: Map<string, string>,
  maxPos: number,
  maxBranch: number,
): Map<string, number> {
  const w = new Map(raw)
  const norm = () => {
    const s = [...w.values()].reduce((a, b) => a + b, 0) || 1
    for (const [k, v] of w) w.set(k, v / s)
  }
  norm()
  const frozen = new Set<string>()
  for (let iter = 0; iter < 50; iter++) {
    let changed = false
    // Per-name cap
    let excess = 0
    for (const [k, v] of w) {
      if (v > maxPos + 1e-9) {
        excess += v - maxPos
        w.set(k, maxPos)
        frozen.add(k)
        changed = true
      }
    }
    // Per-branch cap
    const branchSum = new Map<string, number>()
    for (const [k, v] of w) {
      const b = branchOfTicker.get(k)!
      branchSum.set(b, (branchSum.get(b) ?? 0) + v)
    }
    const cappedBranches = new Set<string>()
    for (const [b, s] of branchSum) {
      if (s > maxBranch + 1e-9) {
        const f = maxBranch / s
        for (const [k, v] of w) {
          if (branchOfTicker.get(k) === b) {
            excess += v - v * f
            w.set(k, v * f)
          }
        }
        cappedBranches.add(b)
        changed = true
      } else if (s >= maxBranch - 1e-9) {
        cappedBranches.add(b)
      }
    }
    if (excess > 1e-9) {
      const recv = [...w.keys()].filter(
        (k) => !frozen.has(k) && !cappedBranches.has(branchOfTicker.get(k)!),
      )
      const base = recv.reduce((a, k) => a + (raw.get(k) ?? 0), 0)
      if (!recv.length || base <= 0) break // nowhere to put it; leave in cash
      for (const k of recv) w.set(k, w.get(k)! + (excess * (raw.get(k) ?? 0)) / base)
    }
    if (!changed) break
  }
  return w
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

/** 0..1, 0.5 = no news. Ticker news counts 70%, its thesis layers 30%. */
function newsFactor(ticker: string, nodeIds: string[], signals: Signals) {
  const t = signals.tickers[ticker] ?? 0
  const ns = nodeIds.map((id) => signals.nodes[id]).filter((v): v is number => v !== undefined)
  const n = ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0
  return clamp(0.5 + 0.5 * (0.7 * t + 0.3 * n))
}

function monthsBetween(fromIso: string, to: Date) {
  const f = new Date(fromIso + 'T00:00:00')
  return (to.getFullYear() - f.getFullYear()) * 12 + (to.getMonth() - f.getMonth()) - (to.getDate() < f.getDate() ? 1 : 0)
}

/** First day of the current buying period (month or quarter since the plan start). */
export function currentPeriodStart(settings: Settings, now = new Date()): string {
  const step = settings.cadence === 'monthly' ? 1 : 3
  const todayIso = now.toISOString().slice(0, 10)
  if (settings.startDate >= todayIso) return settings.startDate
  const k = Math.floor(Math.max(0, monthsBetween(settings.startDate, now)) / step)
  return addMonths(settings.startDate, k * step)
}

function buildTranches(
  recs: Recommendation[],
  idx: TreeIndex,
  settings: Settings,
): Tranche[] {
  const step = settings.cadence === 'monthly' ? 1 : 3
  // Schedule from today over whatever is left of the horizon, so the plan
  // compresses as time passes instead of restarting.
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const elapsed = Math.max(0, monthsBetween(settings.startDate, today))
  const start = settings.startDate > todayIso ? settings.startDate : todayIso
  const T = Math.max(1, Math.round((settings.horizonMonths - elapsed) / step))
  const tranches: Tranche[] = Array.from({ length: T }, (_, i) => ({
    index: i,
    date: addMonths(start, i * step),
    buys: [],
    total: 0,
  }))
  for (const r of recs) {
    if (r.gap <= 0 || (r.action !== 'BUY' && r.action !== 'ADD') || !r.scored) continue
    const node = idx.byId.get(r.scored.primaryNodeId)
    // Urgency from catalyst timing, nudged by rank-in-score.
    const u = node ? TIMING_SCORE[node.timing] : 0.65
    const s = clamp(2 * u - 1, -1, 1)
    const weights = Array.from({ length: T }, (_, t) =>
      T === 1 ? 1 : Math.max(0, 1 + settings.frontLoad * s * (1 - (2 * t) / (T - 1))),
    )
    const ws = weights.reduce((a, b) => a + b, 0) || 1
    weights.forEach((wt, t) => {
      const amt = Math.round((r.gap * wt) / ws / 50) * 50
      if (amt >= 50) {
        tranches[t].buys.push({ ticker: r.ticker, amount: amt })
        tranches[t].total += amt
      }
    })
  }
  for (const t of tranches) t.buys.sort((a, b) => b.amount - a.amount)
  return tranches
}

const fmtK = (v: number) => (v < 500 ? `$${Math.round(v)}` : `$${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}k`)

function explain(
  s: ScoredCompany,
  idx: TreeIndex,
  settings: Settings,
  rec: Pick<Recommendation, 'targetPct' | 'targetValue' | 'currentValue' | 'gap'>,
): string[] {
  const c = s.company
  const node = idx.byId.get(s.primaryNodeId)!
  const chain = pathTo(idx, node.id).map((n) => n.label).join(' → ')
  const role = s.activeExposures.find((e) => e.nodeId === node.id)?.role ?? ''
  const why: string[] = [`${chain}: ${role}.`]
  why.push(`Bottleneck: ${node.bottleneck}`)

  const drivers: { v: number; text: string }[] = [
    { v: settings.weights.conviction * s.factors.conviction, text: `conviction ${node.conviction}/5 on "${node.label}"` },
    { v: settings.weights.bottleneck * s.factors.bottleneck, text: `scarcity ${node.scarcity}/5` },
    { v: settings.weights.beta * s.factors.beta, text: `high beta (~${c.beta.toFixed(1)})` },
    { v: settings.weights.depth * s.factors.depth, text: `${idx.depth.get(node.id)} levels down from the GPU buildout` },
    { v: settings.weights.purity * s.factors.purity, text: `~${Math.round(c.purity * 100)}% AI exposure` },
    { v: settings.weights.smallCap * s.factors.smallCap, text: `${c.cap}-cap, less crowded` },
    { v: settings.weights.catalyst * s.factors.catalyst, text: `catalyst window: ${node.timing}` },
    { v: settings.weights.news * Math.max(0, s.factors.news - 0.5) * 2, text: 'supportive recent news' },
  ]
  drivers.sort((a, b) => b.v - a.v)
  why.push(`Scores well on: ${drivers.slice(0, 3).map((d) => d.text).join(', ')}.`)
  if (s.activeExposures.length > 1) {
    const others = s.activeExposures
      .filter((e) => e.nodeId !== node.id)
      .map((e) => idx.byId.get(e.nodeId)?.label)
      .filter(Boolean)
    why.push(`Also exposed to: ${others.join(', ')}.`)
  }
  why.push(
    `Target ${rec.targetPct.toFixed(1)}% (${fmtK(rec.targetValue)}), you hold ${fmtK(rec.currentValue)}.` +
      (rec.gap > 0 ? ` Build ${fmtK(rec.gap)} over the plan.` : ''),
  )
  if (s.factors.news <= 0.35) why.push('News flow has turned negative. Check the Today tab before adding.')
  if (c.note) why.push(`Watch: ${c.note}`)
  return why
}

export function runPlan(
  nodes: ThesisNode[],
  companies: Company[],
  positions: Position[],
  settings: Settings,
  signals?: Signals,
): PlanResult {
  const idx = indexTree(nodes)
  const holdings = new Map<string, number>()
  for (const p of positions) {
    const t = p.ticker.trim().toUpperCase()
    if (!t) continue
    holdings.set(t, (holdings.get(t) ?? 0) + marketValue(p))
  }
  const currentTotal = [...holdings.values()].reduce((a, b) => a + b, 0)
  const scored = scoreCompanies(companies, idx, settings, new Set(holdings.keys()), signals)
  const selected = scored.slice(0, Math.max(1, settings.numPositions))
  const selectedSet = new Set(selected.map((s) => s.company.ticker))

  // Holdings we will not target are left alone and count against the budget.
  let outsideValue = 0
  for (const [t, v] of holdings) if (!selectedSet.has(t)) outsideValue += v
  const total = Math.max(settings.capital, currentTotal)
  const investable = Math.max(0, total * (1 - settings.cashReservePct / 100) - outsideValue)

  const raw = new Map(selected.map((s) => [s.company.ticker, Math.pow(Math.max(s.score, 1e-6), settings.concentration)]))
  const branchMap = new Map(selected.map((s) => [s.company.ticker, s.branchId]))
  const maxPos = settings.maxPositionPct / 100
  const maxBranch = settings.maxBranchPct / 100
  let weights = capWeights(raw, branchMap, maxPos * (total / Math.max(investable, 1)), maxBranch * (total / Math.max(investable, 1)))
  // Drop names below the minimum and re-run caps once.
  const minW = (settings.minPositionPct / 100) * (total / Math.max(investable, 1))
  const keep = new Map([...raw].filter(([k]) => (weights.get(k) ?? 0) >= minW - 1e-9))
  if (keep.size && keep.size < raw.size) {
    weights = capWeights(keep, branchMap, maxPos * (total / Math.max(investable, 1)), maxBranch * (total / Math.max(investable, 1)))
  }
  const scoredByTicker = new Map(scored.map((s) => [s.company.ticker, s]))

  const recs: Recommendation[] = []
  const tol = total * 0.01
  for (const [ticker, wt] of weights) {
    const s = scoredByTicker.get(ticker)!
    const targetValue = wt * investable
    const currentValue = holdings.get(ticker) ?? 0
    const gap = targetValue - currentValue
    let action: Recommendation['action'] = 'HOLD'
    let effGap = 0
    if (gap > tol || (currentValue === 0 && gap > 0)) {
      action = currentValue > 0 ? 'ADD' : 'BUY'
      effGap = gap
    } else if (gap < 0 && settings.allowTrims && currentValue > targetValue * 1.25 && -gap > tol) {
      action = 'TRIM'
      effGap = gap
    }
    const base = { targetPct: (targetValue / total) * 100, targetValue, currentValue, gap: effGap }
    recs.push({ ticker, scored: s, ...base, action, why: explain(s, idx, settings, base) })
  }
  for (const [ticker, v] of holdings) {
    if (weights.has(ticker)) continue
    const s = scoredByTicker.get(ticker)
    recs.push({
      ticker,
      scored: s,
      targetPct: 0,
      targetValue: 0,
      currentValue: v,
      gap: 0,
      action: s ? 'HOLD' : 'OUTSIDE',
      why: s
        ? [`In the thesis but outside the current top ${settings.numPositions}. Hold, don't add. Revisit if the thesis on "${idx.byId.get(s.primaryNodeId)?.label}" weakens.`]
        : ['Not in the thesis universe. Left untouched, and its value is set aside from the AI budget.'],
    })
  }
  const order = { BUY: 0, ADD: 1, HOLD: 2, TRIM: 3, OUTSIDE: 4 }
  recs.sort((a, b) => order[a.action] - order[b.action] || b.targetValue - a.targetValue)

  // Allocation by node: split each target across its active exposures.
  const nodeDirect: Record<string, number> = {}
  const branchAllocation: Record<string, number> = {}
  for (const r of recs) {
    if (!r.scored || r.targetValue <= 0) continue
    const ex = r.scored.activeExposures
    const ws = ex.map((e) => {
      const n = idx.byId.get(e.nodeId)!
      return n.conviction * n.scarcity
    })
    const sum = ws.reduce((a, b) => a + b, 0) || 1
    ex.forEach((e, i) => {
      nodeDirect[e.nodeId] = (nodeDirect[e.nodeId] ?? 0) + (r.targetValue * ws[i]) / sum
    })
    branchAllocation[r.scored.branchId] = (branchAllocation[r.scored.branchId] ?? 0) + r.targetValue
  }
  const nodeAllocation: Record<string, number> = {}
  for (const [id, v] of Object.entries(nodeDirect)) {
    for (const n of pathTo(idx, id)) nodeAllocation[n.id] = (nodeAllocation[n.id] ?? 0) + v
  }

  const tranches = buildTranches(recs, idx, settings)
  return {
    ranAt: new Date().toISOString(),
    investable,
    outsideValue,
    currentTotal,
    recommendations: recs,
    ranked: scored,
    nodeAllocation,
    branchAllocation,
    tranches,
    totalBuys: recs.filter((r) => r.gap > 0).reduce((a, r) => a + r.gap, 0),
    totalTrims: recs.filter((r) => r.gap < 0).reduce((a, r) => a - r.gap, 0),
  }
}
