import { useState } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import type { Store } from '../lib/store'
import type { Position } from '../types'
import { marketValue } from '../engine/allocate'
import { usd } from '../lib/format'

const newId = () => Math.random().toString(36).slice(2, 10)

export function PositionsView({ store }: { store: Store }) {
  const { state, update, plan } = store
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
      rows.push({ id: newId(), ticker: ticker.toUpperCase(), shares: Number(shares) || 0, avgCost: Number(avgCost) || 0, price: Number(price) || 0 })
    }
    update((s) => ({ positions: [...s.positions, ...rows] }))
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
            <p className="text-[12.5px] ink2">Enter what you own so the plan only suggests what's missing. Update "last price" whenever you re-run.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn" onClick={() => setShowPaste((v) => !v)}><Upload size={14} /> Paste from broker</button>
            <button className="btn btn-primary" onClick={add}><Plus size={14} /> Add position</button>
          </div>
        </div>
        {showPaste && (
          <div className="mt-3 space-y-2">
            <textarea className="input font-mono" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)}
              placeholder={'ticker, shares, avg cost, last price\nLITE, 120, 88.50, 140\nVRT, 200, 95, 130'} />
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
                    <input className="input uppercase font-semibold" value={p.ticker} onChange={(e) => setPos(p.id, { ticker: e.target.value.toUpperCase() })} />
                  </td>
                  <td className="px-3 py-1.5"><input className="input text-right" type="number" value={p.shares || ''} onChange={(e) => setPos(p.id, { shares: Number(e.target.value) })} /></td>
                  <td className="px-3 py-1.5"><input className="input text-right" type="number" step="0.01" value={p.avgCost || ''} onChange={(e) => setPos(p.id, { avgCost: Number(e.target.value) })} /></td>
                  <td className="px-3 py-1.5"><input className="input text-right" type="number" step="0.01" value={p.price || ''} onChange={(e) => setPos(p.id, { price: Number(e.target.value) })} /></td>
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
