import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Store } from '../lib/store'
import type { Action, Recommendation } from '../types'
import { branchColors, filingsUrl, quoteUrl, usdK } from '../lib/format'
import { indexTree, pathTo } from '../engine/tree'
import { WeightsPanel } from './WeightsPanel'
import { NewsBox } from './NewsBox'
import { DayChange } from './PriceStatus'
import type { Quote } from '../lib/prices'
import type { AiCtx } from '../lib/claude'

const ACTION_STYLE: Record<Action, { label: string; color: string }> = {
  BUY: { label: 'Buy', color: 'var(--good)' },
  ADD: { label: 'Add', color: 'var(--good)' },
  HOLD: { label: 'Hold', color: 'var(--text-2)' },
  TRIM: { label: 'Trim', color: 'var(--bad)' },
  OUTSIDE: { label: 'Outside thesis', color: 'var(--muted)' },
}

export function PlanView({ store, onOpenNode }: { store: Store; onOpenNode: (id: string) => void }) {
  const { state, plan } = store
  const idx = useMemo(() => indexTree(state.nodes), [state.nodes])
  const colors = useMemo(() => branchColors(state.nodes), [state.nodes])
  const [filter, setFilter] = useState<'all' | 'buys' | 'held'>('all')
  const [branch, setBranch] = useState<string>('all')

  const total = Math.max(state.settings.capital, plan.currentTotal)
  const targeted = plan.recommendations.reduce((a, r) => a + r.targetValue, 0)
  const unallocated = Math.max(0, plan.investable - targeted)
  const branches = Object.entries(plan.branchAllocation).sort((a, b) => b[1] - a[1])

  const recs = plan.recommendations.filter((r) => {
    if (filter === 'buys' && r.gap <= 0) return false
    if (filter === 'held' && r.currentValue <= 0) return false
    if (branch !== 'all' && r.scored?.branchId !== branch) return false
    return true
  })

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="card p-4 lg:sticky lg:top-[112px] lg:max-h-[calc(100vh-128px)] lg:overflow-y-auto">
        <WeightsPanel store={store} />
      </aside>

      <div className="space-y-5 min-w-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile label="Portfolio" value={usdK(total)} sub={`${usdK(plan.currentTotal)} invested today`} />
          <Tile label="Target in thesis" value={usdK(targeted)} sub={`${plan.recommendations.filter((r) => r.targetValue > 0).length} names`} />
          <Tile label="To deploy" value={usdK(plan.totalBuys)} sub={`over ${state.settings.horizonMonths} months`} />
          <Tile label="Cash / unallocated" value={usdK(total * state.settings.cashReservePct / 100 + unallocated)}
            sub={plan.outsideValue > 0 ? `${usdK(plan.outsideValue)} held outside thesis` : `${state.settings.cashReservePct}% reserve`} />
        </div>

        <div className="card p-4">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-[14px] font-semibold">Target allocation by thesis branch</h3>
            <span className="text-[12px] muted">cap {state.settings.maxBranchPct}% per branch</span>
          </div>
          <div className="flex h-3.5 w-full overflow-hidden rounded-[4px] gap-[2px]" role="img" aria-label="Allocation by branch">
            {branches.map(([id, v]) => (
              <div key={id} title={`${idx.byId.get(id)?.label}: ${usdK(v)} (${((v / total) * 100).toFixed(1)}%)`}
                style={{ width: `${(v / total) * 100}%`, background: colors[id] ?? 'var(--muted)' }} />
            ))}
            <div title={`Cash, unallocated & outside: ${usdK(total - targeted)}`} style={{ flex: 1, background: 'var(--surface-2)' }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]">
            {branches.map(([id, v]) => (
              <button key={id} className="inline-flex items-center gap-1.5 hover:underline" onClick={() => setBranch(branch === id ? 'all' : id)}>
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colors[id] }} />
                <span className={branch === id ? 'font-semibold' : 'ink2'}>{idx.byId.get(id)?.label}</span>
                <span className="num font-medium">{((v / total) * 100).toFixed(0)}%</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-semibold mr-2">Suggested buys & holds</h3>
          {(['all', 'buys', 'held'] as const).map((f) => (
            <button key={f} className="chip" style={filter === f ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' } : undefined}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'buys' ? 'Buys only' : 'Already held'}
            </button>
          ))}
          {branch !== 'all' && <button className="chip" onClick={() => setBranch('all')}>{idx.byId.get(branch)?.label} ✕</button>}
        </div>

        <div className="space-y-2">
          {recs.map((r) => (
            <RecCard key={r.ticker} r={r} total={total} color={r.scored ? colors[r.scored.branchId] : 'var(--muted)'}
              chain={r.scored ? pathTo(idx, r.scored.primaryNodeId).slice(1) : []} ai={store.ai} quote={state.quotes[r.ticker]} onOpenNode={onOpenNode} />
          ))}
          {recs.length === 0 && <p className="muted text-[13px]">Nothing matches this filter.</p>}
        </div>
      </div>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="label">{label}</div>
      <div className="text-[22px] font-semibold num leading-tight mt-0.5">{value}</div>
      <div className="text-[12px] muted mt-0.5">{sub}</div>
    </div>
  )
}

function RecCard({ r, total, color, chain, ai, quote, onOpenNode }: {
  r: Recommendation; total: number; color: string; chain: { id: string; label: string }[]; ai: AiCtx; quote?: Quote; onOpenNode: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const c = r.scored?.company
  const a = ACTION_STYLE[r.action]
  const maxV = Math.max(r.targetValue, r.currentValue, 1)
  return (
    <div className="card">
      <button className="w-full text-left px-4 py-3 flex items-center gap-3" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? <ChevronDown size={16} className="muted shrink-0" /> : <ChevronRight size={16} className="muted shrink-0" />}
        <span className="inline-block h-8 w-1 rounded-sm shrink-0" style={{ background: color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[14px]">{r.ticker}</span>
            <span className="text-[12.5px] ink2 truncate">{c?.name}</span>
            <span className="chip" style={{ color: a.color, borderColor: a.color }}>{a.label}</span>
            {c && !c.usListed && <span className="chip">non-US</span>}
            {c?.origin === 'ai' && <span className="chip">AI-added</span>}
            {quote && (
              <span className="text-[12px] num ink2" title={`Last trade ${new Date(quote.time).toLocaleString()}`}>
                ${quote.priceUsd.toFixed(2)} <DayChange pct={quote.changePct} />
              </span>
            )}
          </div>
          <div className="text-[12px] muted truncate">{chain.map((n) => n.label).join(' → ')}</div>
        </div>
        <div className="hidden sm:block w-40 shrink-0" aria-hidden>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
            <div className="h-1.5 rounded-full" style={{ width: `${(r.targetValue / maxV) * 100}%`, background: color, opacity: 0.35 }} />
          </div>
          <div className="h-1.5 rounded-full -mt-1.5" style={{ width: `${(r.currentValue / maxV) * 100}%`, background: color }} />
        </div>
        <div className="text-right num shrink-0 w-36">
          <div className="text-[14px] font-semibold">{r.gap > 0 ? `+${usdK(r.gap)}` : r.gap < 0 ? usdK(r.gap) : usdK(r.currentValue)}</div>
          <div className="text-[11.5px] muted">
            {r.targetValue > 0 ? `${((r.targetValue / total) * 100).toFixed(1)}% target` : 'no target'}
            {quote && r.gap !== 0 && ` · ≈${Math.abs(Math.round(r.gap / quote.priceUsd)).toLocaleString()} sh`}
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-[52px] space-y-3">
          <ul className="space-y-1 text-[13px] leading-relaxed list-disc pl-4">
            {r.why.map((w, i) => <li key={i} className={i === 0 ? '' : 'ink2'}>{w}</li>)}
          </ul>
          <div className="flex flex-wrap gap-1.5">
            {chain.map((n) => <button key={n.id} className="chip hover:underline" onClick={() => onOpenNode(n.id)}>{n.label}</button>)}
          </div>
          {c && (
            <NewsBox ai={ai} subject={`${c.name} (${c.ticker})`}
              context={r.why.slice(0, 2).join(' ')}
              query={`"${c.name}"`}
              company={{ ticker: c.ticker, yahoo: c.yahoo, usListed: c.usListed }}
              extraLinks={[
                { label: 'Quote', href: quoteUrl(c.yahoo) },
                ...(c.usListed ? [{ label: 'SEC filings', href: filingsUrl(c.ticker) }] : []),
              ]} />
          )}
        </div>
      )}
    </div>
  )
}
