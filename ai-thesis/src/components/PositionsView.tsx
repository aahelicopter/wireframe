import { useState } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import type { Store } from '../lib/store'
import type { Position } from '../types'
import type { Quote } from '../lib/prices'
import { marketValue } from '../engine/allocate'
import { usd } from '../lib/format'
import { DayChange } from './PriceStatus'

const newId = () => Math.random().toString(36).slice(2, 10)

export function PositionsView({ store }: { store: Store }) {
  const { state, update, plan, refreshPrices } = store
  const [paste, setPaste] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const known = new Set(state.companies.map((c) => c.ticker))
  const recs = new Map(plan.recommendations.map((r) => [r.ticker, r]))

  const setPos = (id: string, patch: Partial<Position>) =>
    update((s) => ({ positions: s.positions.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  const add = () => update((s) => ({ positions: [...s.positions, { id: newId(), ticker: '', shares: 0, avgCost: 0, price: 0 }] }))
  const remove = (id: string) => update((s) => ({ positions: s.positions.filter((p) => p.id !== id) }))

  const importPaste = () => {
    const rows: Position[] = []
    for (const line of paste.split(/\r?\n/)) {
      const parts = line.split(/[,\t]/).map((x) => x.trim().replace(/[$,]/g, ''))
      if (!parts[0] || /ticker|symbol/i.test(parts[0])) continue
      const [ticker, shares, avgCost, price] = parts
      // A pasted price is a snapshot, so live quotes may replace it.
      rows.push({ id: newId(), ticker: ticker.toUpperCase(), shares: Number(shares) || 0, avgCost: Number(avgCost) || 0, price: Number(price) || 0 })
    }
    update((s) => ({ positions: [...s.positions, ...rows] }))
    // Let the state commit, then pull prices for the new tickers.
    setTimeout(() => void refreshPrices(), 0)
    setPaste('')
    setShowPaste(false)
  }

  const total = state.positions.reduce((a, p) => a + marketValue(p), 0)
  const cost = state.positions.reduce((a, p) => a + p.shares * p.avgCost, 0)

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-semibold">Current positions</h3>
            <p className="text-[12.5px] ink2">Enter what you own so the plan only suggests what's missing. Prices fill in live. Type a price to override it.</p>
            <label className="mt-1 flex items-center gap-2 text-[12.5px] cursor-pointer">
              <input type="checkbox" style={{ accentColor: 'var(--accent)' }} checked={state.liveRefresh} onChange={(e) => update({ liveRefresh: e.target.checked })} />
              Auto-refresh prices every 5 minutes
            </label>
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={() => setShowPaste((v) => !v)}><Upload size={14} /> Paste from broker</button>
            <button className="btn btn-primary" onClick={add}><Plus size={14} /> Add position</button>
          </div>
        </div>
        {showPaste && (
          <div className="mt-3 space-y-2">
            <textarea className="input font-mono" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)}
              placeholder={'ticker, shares, avg cost\nLITE, 120, 88.50\nVRT, 200, 95'} />
            <button className="btn btn-primary" onClick={importPaste} disabled={!paste.trim()}>Import rows</button>
          </div>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-[13px] num min-w-[720px]">
          <thead>
            <tr className="text-left label border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="px-3 py-2">Ticker</th>
              <th className="px-3 py-2 text-right">Shares</th>
              <th className="px-3 py-2 text-right">Avg cost</th>
              <th className="px-3 py-2 text-right">Last price</th>
              <th className="px-3 py-2 text-right">Value</th>
              <th className="px-3 py-2 text-right">P/L</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {state.positions.map((p) => {
              const v = marketValue(p)
              const pl = p.price && p.avgCost ? (p.price - p.avgCost) * p.shares : 0
              const r = recs.get(p.ticker.toUpperCase())
              return (
                <tr key={p.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-3 py-1.5 w-28">
                    <input className="input uppercase font-semibold" value={p.ticker} onChange={(e) => setPos(p.id, { ticker: e.target.value.toUpperCase() })}
                      onBlur={() => p.ticker && !state.quotes[p.ticker.trim()] && void refreshPrices()} />
                  </td>
                  <td className="px-3 py-1.5"><input className="input text-right" type="number" value={p.shares || ''} onChange={(e) => setPos(p.id, { shares: Number(e.target.value) })} /></td>
                  <td className="px-3 py-1.5"><input className="input text-right" type="number" step="0.01" value={p.avgCost || ''} onChange={(e) => setPos(p.id, { avgCost: Number(e.target.value) })} /></td>
                  <td className="px-3 py-1.5 w-40">
                    <input className="input text-right" type="number" step="0.01" value={p.price || ''}
                      onChange={(e) => setPos(p.id, { price: Number(e.target.value), priceSource: 'manual' })} />
                    <PriceNote q={state.quotes[p.ticker.trim()]} manual={p.priceSource === 'manual'}
                      onUseLive={() => {
                        const q = state.quotes[p.ticker.trim()]
                        setPos(p.id, { priceSource: 'live', ...(q ? { price: Math.round(q.priceUsd * 10000) / 10000 } : {}) })
                      }} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium">{usd(v)}</td>
                  <td className="px-3 py-1.5 text-right" style={{ color: pl > 0 ? 'var(--good)' : pl < 0 ? 'var(--bad)' : undefined }}>{pl ? usd(pl) : '–'}</td>
                  <td className="px-3 py-1.5 text-[12px]">
                    {!p.ticker ? '' : !known.has(p.ticker.toUpperCase()) ? <span className="muted">not in universe</span>
                      : r ? <span>{r.action === 'HOLD' ? 'Hold' : r.action === 'ADD' ? `Add ${usd(r.gap)}` : r.action === 'TRIM' ? `Trim ${usd(-r.gap)}` : r.action}</span>
                      : <span className="muted">re-run</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <button className="btn !px-2" onClick={() => remove(p.id)} aria-label="Remove"><Trash2 size={14} /></button>
                  </td>
                </tr>
              )
            })}
            {state.positions.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center muted">No positions yet. Add them or paste from your broker. With none entered, the plan assumes you're starting from cash.</td></tr>
            )}
          </tbody>
          {state.positions.length > 0 && (
            <tfoot>
              <tr className="font-semibold">
                <td className="px-3 py-2" colSpan={4}>Total</td>
                <td className="px-3 py-2 text-right">{usd(total)}</td>
                <td className="px-3 py-2 text-right" style={{ color: total - cost >= 0 ? 'var(--good)' : 'var(--bad)' }}>{cost ? usd(total - cost) : ''}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

function PriceNote({ q, manual, onUseLive }: { q?: Quote; manual: boolean; onUseLive: () => void }) {
  if (manual) {
    return (
      <div className="text-[11px] text-right muted mt-0.5">
        manual{q && <> · <button className="link" onClick={onUseLive}>use live {usd2(q.priceUsd)}</button></>}
      </div>
    )
  }
  if (!q) return <div className="text-[11px] text-right muted mt-0.5">no live quote</div>
  return (
    <div className="text-[11px] text-right muted mt-0.5" title={`Last trade ${new Date(q.time).toLocaleString()}`}>
      {q.currency !== 'USD' && <>{q.price.toLocaleString('en-US', { maximumFractionDigits: 2 })} {q.currency} · </>}
      live <DayChange pct={q.changePct} />
    </div>
  )
}

const usd2 = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
