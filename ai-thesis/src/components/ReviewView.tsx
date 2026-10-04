import { useMemo, useState } from 'react'
import { Bot, Check, Copy, Loader2, Play, X } from 'lucide-react'
import type { Store } from '../lib/store'
import type { AgentLink } from '../lib/agentSync'
import type { Order, OrderStatus } from '../types'
import type { ReviewResult, ReviewStep } from '../lib/review'
import { applyFill } from '../engine/orders'
import { usd, usdK } from '../lib/format'
import { timeAgo } from '../lib/news'
import { ImpactBadge } from './NewsBox'

export function isReviewDue(store: Store) {
  const r = store.state.review
  if (!r.lastRunAt) return true
  return Date.now() - new Date(r.lastRunAt).getTime() >= r.cadenceDays * 86400000 - 3600000
}

const STEPS: { id: ReviewStep; label: string }[] = [
  { id: 'prices', label: 'Prices' },
  { id: 'news', label: 'News' },
  { id: 'ai', label: 'AI scoring' },
  { id: 'plan', label: 'Plan & orders' },
]

const STATUS_COLOR: Record<OrderStatus, string> = {
  proposed: 'var(--text-2)',
  approved: 'var(--accent)',
  sent: 'var(--warn)',
  filled: 'var(--good)',
  failed: 'var(--bad)',
  rejected: 'var(--muted)',
  expired: 'var(--muted)',
}

interface Props {
  store: Store
  agent: AgentLink
  running: ReviewStep | null
  result: ReviewResult | null
  onRun: () => void
  onOpenNode: (id: string) => void
}

export function ReviewView({ store, agent, running, result, onRun, onOpenNode }: Props) {
  const { state, update, updateNode, signals } = store
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const due = isReviewDue(store)
  const nextDue = state.review.lastRunAt ? new Date(new Date(state.review.lastRunAt).getTime() + state.review.cadenceDays * 86400000) : null

  const proposed = state.orders.filter((o) => o.status === 'proposed')
  const active = state.orders.filter((o) => o.status === 'approved' || o.status === 'sent')
  const history = state.orders.filter((o) => ['filled', 'failed', 'rejected', 'expired'].includes(o.status)).slice(-25).reverse()
  const pendingProposals = state.proposals.filter((p) => p.status === 'pending')
  const nodeLabel = (id: string) => state.nodes.find((n) => n.id === id)?.label ?? id

  const setOrders = (fn: (o: Order) => Order) => update((s) => ({ orders: s.orders.map(fn) }))
  const setStatus = (ids: Set<string>, status: OrderStatus) => {
    const now = new Date().toISOString()
    setOrders((o) => (ids.has(o.id) ? { ...o, status, ...(status === 'approved' ? { approvedAt: now } : {}) } : o))
    setSelected(new Set())
  }
  const edit = (id: string, patch: Partial<Order>) => setOrders((o) => (o.id === id ? { ...o, ...patch, notional: Math.round((patch.qty ?? o.qty) * o.refPrice * 100) / 100 } : o))

  const markFilled = (o: Order) => {
    const qty = Number(prompt(`Filled quantity for ${o.side} ${o.ticker}`, String(o.qty)))
    if (!(qty > 0)) return
    const px = Number(prompt('Average fill price (USD)', String(o.limitPrice)))
    if (!(px > 0)) return
    update((s) => ({
      orders: s.orders.map((x) => (x.id === o.id ? { ...x, status: 'filled' as const, fill: { qty, avgPrice: px, at: new Date().toISOString() }, note: 'Marked filled by hand' } : x)),
      positions: applyFill(s.positions, o, { qty, avgPrice: px }),
    }))
  }

  const movers = useMemo(() => {
    const all = Object.entries(signals.tickers).map(([k, v]) => ({ k, v, node: false }))
      .concat(Object.entries(signals.nodes).map(([k, v]) => ({ k, v, node: true })))
      .filter((x) => Math.abs(x.v) >= 0.15)
      .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
      .slice(0, 12)
    return all.map((m) => ({
      ...m,
      headlines: Object.values(state.scored).filter((h) => h.subject === m.k).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 3),
    }))
  }, [signals, state.scored])

  const sum = (os: Order[], side: Order['side']) => os.filter((o) => o.side === side).reduce((a, o) => a + o.notional, 0)

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5 min-w-0">
        {/* Run */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="mr-auto">
              <h3 className="text-[15px] font-semibold">Daily review</h3>
              <p className="text-[12.5px] ink2">
                {state.review.lastRunAt ? `Last run ${timeAgo(state.review.lastRunAt)}. ` : 'Never run. '}
                {due ? <b style={{ color: 'var(--warn)' }}>Due now.</b> : nextDue && `Next due ${nextDue.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.`}
              </p>
            </div>
            <select className="input !w-auto" value={state.review.cadenceDays} onChange={(e) => update((s) => ({ review: { ...s.review, cadenceDays: Number(e.target.value) } }))}>
              <option value={1}>Every day</option>
              <option value={2}>Every other day</option>
              <option value={7}>Weekly</option>
            </select>
            <button className="btn btn-primary" onClick={onRun} disabled={!!running}>
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {running ? 'Running…' : 'Run review'}
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-[12.5px] cursor-pointer">
            <input type="checkbox" style={{ accentColor: 'var(--accent)' }} checked={state.review.autoRun}
              onChange={(e) => update((s) => ({ review: { ...s.review, autoRun: e.target.checked } }))} />
            Run automatically when I open the app and a review is due
          </label>
          {running && (
            <div className="mt-3 flex gap-2 text-[12px]">
              {STEPS.map((st) => {
                const i = STEPS.findIndex((x) => x.id === running)
                const j = STEPS.findIndex((x) => x.id === st.id)
                return <span key={st.id} className="chip" style={j < i ? { color: 'var(--good)' } : j === i ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}>{st.label}</span>
              })}
            </div>
          )}
          {result && !running && (
            <p className="mt-3 text-[12.5px] ink2">
              {result.newHeadlines} new headlines · {result.scoredHeadlines} carried thesis signal · {result.proposals} thesis suggestions · {result.orders} orders proposed
              {state.apiKey ? ` · AI cost ≈ $${result.aiCostUsd.toFixed(3)}` : ' · AI scoring off (no API key)'}
              {result.deferred > 0 && ` · ${result.deferred} headlines left for the next run`}
              {result.aiError && <span style={{ color: 'var(--bad)' }}> · AI: {result.aiError}</span>}
            </p>
          )}
        </div>

        {agent.brokerPositions && (
          <div className="card p-4 flex flex-wrap items-center gap-3" style={{ borderColor: 'var(--accent)' }}>
            <span className="text-[13px] mr-auto">
              Your agent reported <b>{agent.brokerPositions.positions.length}</b> broker positions ({timeAgo(agent.brokerPositions.at)}). Replace the Positions tab with them?
            </span>
            <button className="btn btn-primary" onClick={agent.applyBrokerPositions}>Use broker positions</button>
            <button className="btn" onClick={agent.dismissBrokerPositions}>Ignore</button>
          </div>
        )}

        {/* Approval queue */}
        <div className="card">
          <div className="px-4 pt-4 pb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold mr-auto">Orders awaiting approval ({proposed.length})</h3>
            <span className="text-[12px] muted num" title="Suggested daily buy budget (guidance, set in Settings)">
              buys {usdK(sum(proposed, 'BUY'))} of {usdK(state.trading.suggestMaxDailyUsd)} suggested/day · sells {usdK(sum(proposed, 'SELL'))}
            </span>
            <button className="btn" disabled={!selected.size} onClick={() => setStatus(selected, 'rejected')}><X size={14} /> Reject</button>
            <button className="btn btn-primary" disabled={!selected.size || state.trading.halted} title={state.trading.halted ? 'Kill switch is on' : ''}
              onClick={() => setStatus(selected, 'approved')}><Check size={14} /> Approve {selected.size || ''}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] num min-w-[760px]">
              <thead>
                <tr className="text-left label border-y" style={{ borderColor: 'var(--border)' }}>
                  <th className="px-3 py-2 w-8">
                    <input type="checkbox" style={{ accentColor: 'var(--accent)' }} checked={proposed.length > 0 && selected.size === proposed.length}
                      onChange={(e) => setSelected(e.target.checked ? new Set(proposed.map((o) => o.id)) : new Set())} aria-label="Select all" />
                  </th>
                  <th className="px-3 py-2">Side</th>
                  <th className="px-3 py-2">Ticker</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Limit / guard</th>
                  <th className="px-3 py-2 text-right">≈ Value</th>
                  <th className="px-3 py-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {proposed.map((o) => (
                  <tr key={o.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-3 py-1.5">
                      <input type="checkbox" style={{ accentColor: 'var(--accent)' }} checked={selected.has(o.id)}
                        onChange={(e) => setSelected((cur) => { const n = new Set(cur); if (e.target.checked) n.add(o.id); else n.delete(o.id); return n })} />
                    </td>
                    <td className="px-3 py-1.5 font-semibold" style={{ color: o.side === 'BUY' ? 'var(--good)' : 'var(--bad)' }}>{o.side}</td>
                    <td className="px-3 py-1.5 font-semibold">{o.ticker}</td>
                    <td className="px-3 py-1.5 w-28"><input className="input text-right" type="number" step="any" value={o.qty}
                      onChange={(e) => { const qty = Number(e.target.value); edit(o.id, { qty, orderType: Number.isInteger(qty) ? 'limit' : 'market' }) }} /></td>
                    <td className="px-3 py-1.5 w-32">
                      <input className="input text-right" type="number" step="0.01" value={o.limitPrice} onChange={(e) => edit(o.id, { limitPrice: Number(e.target.value) })} />
                      <div className="text-[10.5px] muted text-right">{o.orderType === 'market' ? 'market, fractional' : 'limit'}</div>
                    </td>
                    <td className="px-3 py-1.5 text-right">{usd(o.notional)}</td>
                    <td className="px-3 py-1.5 text-[12px] ink2">{o.reason}</td>
                  </tr>
                ))}
                {proposed.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-5 text-center muted">Nothing to approve. Run a review to generate this period's orders.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2.5 text-[11.5px] muted">
            Whole-share orders are day limit orders. Fractional quantities go as market orders, because Robinhood only allows fractional shares on market orders; the agent skips one if the ask is above the guard price. Approved orders expire at the end of the next day. Your agent can only see and place approved orders. It can't create or resize them.
          </p>
        </div>

        {(active.length > 0 || history.length > 0) && (
          <div className="card p-4">
            <h3 className="text-[15px] font-semibold mb-2">Execution</h3>
            <table className="w-full text-[12.5px] num">
              <tbody>
                {[...active, ...history].map((o) => (
                  <tr key={o.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-1.5"><span className="chip" style={{ color: STATUS_COLOR[o.status], borderColor: STATUS_COLOR[o.status] }}>{o.status}</span></td>
                    <td className="py-1.5 font-semibold">{o.side} {o.ticker}</td>
                    <td className="py-1.5 text-right">{o.fill ? `${o.fill.qty} @ ${o.fill.avgPrice.toFixed(2)}` : `${o.qty} @ ≤${o.limitPrice.toFixed(2)}`}</td>
                    <td className="py-1.5 pl-3 muted truncate max-w-[220px]">{o.note ?? ''}</td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      {(o.status === 'approved' || o.status === 'sent') && (
                        <>
                          <button className="link mr-3" onClick={() => markFilled(o)}>Mark filled</button>
                          {o.status === 'approved' && <button className="link" onClick={() => setStatus(new Set([o.id]), 'rejected')}>Cancel</button>}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Thesis proposals */}
        <div className="card p-4">
          <h3 className="text-[15px] font-semibold mb-1">Thesis changes suggested by the news ({pendingProposals.length})</h3>
          <p className="text-[12px] muted mb-3">Claude proposes these only when several headlines point the same way. Accepting changes the node, then hit Run to re-plan.</p>
          <div className="space-y-3">
            {pendingProposals.map((p) => (
              <div key={p.id} className="rounded-md border p-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-wrap items-center gap-2">
                  <button className="font-semibold text-[13.5px] hover:underline" onClick={() => onOpenNode(p.nodeId)}>{nodeLabel(p.nodeId)}</button>
                  <span className="chip num" style={{ color: p.to > p.from ? 'var(--good)' : 'var(--bad)' }}>{p.field} {p.from} → {p.to}</span>
                  <span className="ml-auto flex gap-2">
                    <button className="btn !py-1" onClick={() => {
                      updateNode(p.nodeId, { [p.field]: p.to })
                      update((s) => ({ proposals: s.proposals.map((x) => (x.id === p.id ? { ...x, status: 'accepted' as const } : x)) }))
                    }}><Check size={13} /> Accept</button>
                    <button className="btn !py-1" onClick={() => update((s) => ({ proposals: s.proposals.map((x) => (x.id === p.id ? { ...x, status: 'dismissed' as const } : x)) }))}>Dismiss</button>
                  </span>
                </div>
                <p className="text-[12.5px] ink2 mt-1">{p.reason}</p>
                <ul className="mt-1 space-y-0.5">
                  {p.evidence.map((e) => <li key={e.url} className="text-[12px]"><a className="link" href={e.url} target="_blank" rel="noreferrer">{e.title}</a></li>)}
                </ul>
              </div>
            ))}
            {pendingProposals.length === 0 && <p className="text-[13px] muted">None right now.</p>}
          </div>
        </div>

        {/* Signals */}
        <div className="card p-4">
          <h3 className="text-[15px] font-semibold mb-1">News signals feeding the plan</h3>
          <p className="text-[12px] muted mb-3">
            Each scored headline counts toward its ticker or thesis layer, fading with a 7-day half-life. The "News flow" factor (Plan tab, weight {state.settings.weights.news}) turns these into score changes.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {movers.map((m) => (
              <div key={m.k} className="rounded-md border p-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  {m.node ? <button className="font-semibold text-[13px] hover:underline" onClick={() => onOpenNode(m.k)}>{nodeLabel(m.k)}</button> : <span className="font-semibold text-[13px]">{m.k}</span>}
                  <span className="num text-[13px] font-semibold" style={{ color: m.v > 0 ? 'var(--good)' : 'var(--bad)' }}>{m.v > 0 ? '▲' : '▼'} {m.v.toFixed(2)}</span>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {m.headlines.map((h) => (
                    <li key={h.id} className="text-[12px] leading-snug flex gap-1.5">
                      <ImpactBadge impact={h.impact} />
                      <span><a className="link" href={h.url} target="_blank" rel="noreferrer">{h.title}</a> <span className="muted">· {h.note}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {movers.length === 0 && <p className="text-[13px] muted">No signals yet. {state.apiKey ? 'Run a review.' : 'Add an Anthropic API key in Settings so reviews can score headlines.'}</p>}
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Bot size={16} />
            <h3 className="text-[14px] font-semibold mr-auto">Trading agent</h3>
            <span className="chip" style={{ color: agent.online ? 'var(--good)' : 'var(--bad)', borderColor: agent.online ? 'var(--good)' : 'var(--bad)' }}>
              {agent.online ? 'API online' : 'API offline'}
            </span>
          </div>
          <p className="text-[12.5px] ink2">
            {agent.lastAgentAt ? `Agent last checked in ${timeAgo(agent.lastAgentAt)}.` : 'No agent has connected yet.'} Setup is in Settings → Trading agent.
          </p>
          {agent.log.length > 0 && (
            <ul className="text-[12px] space-y-0.5 pt-1">
              {agent.log.slice(0, 8).map((l, i) => <li key={i}><span className="muted num">{timeAgo(l.at)}</span> · {l.msg}</li>)}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center mb-2">
            <h3 className="text-[14px] font-semibold mr-auto">Brief</h3>
            {state.review.brief && (
              <button className="btn !py-1 text-[12px]" onClick={() => { void navigator.clipboard?.writeText(state.review.brief!); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
                <Copy size={12} /> {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          {state.review.brief
            ? <pre className="text-[11.5px] whitespace-pre-wrap leading-relaxed ink2 max-h-[520px] overflow-auto">{state.review.brief}</pre>
            : <p className="text-[12.5px] muted">Run a review to generate today's brief. Your agent can read it at /api/agent/brief.</p>}
        </div>
      </aside>
    </div>
  )
}
