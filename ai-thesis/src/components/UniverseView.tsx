import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Store } from '../lib/store'
import type { CapSize, Company } from '../types'
import { indexTree, pathTo } from '../engine/tree'
import { quoteUrl, usdK } from '../lib/format'

export function UniverseView({ store, onOpenNode }: { store: Store; onOpenNode: (id: string) => void }) {
  const { state, plan, update } = store
  const idx = useMemo(() => indexTree(state.nodes), [state.nodes])
  const [q, setQ] = useState('')
  const rank = new Map(plan.ranked.map((s, i) => [s.company.ticker, { i: i + 1, score: s.score }]))
  const target = new Map(plan.recommendations.map((r) => [r.ticker, r.targetValue]))

  const setCo = (ticker: string, patch: Partial<Company>) =>
    update((s) => ({ companies: s.companies.map((c) => (c.ticker === ticker ? { ...c, ...patch } : c)) }))

  const rows = state.companies
    .filter((c) => !q || `${c.ticker} ${c.name} ${c.exposures.map((e) => idx.byId.get(e.nodeId)?.label).join(' ')}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (rank.get(a.ticker)?.i ?? 999) - (rank.get(b.ticker)?.i ?? 999))

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-semibold">Universe ({state.companies.length} companies)</h3>
            <p className="text-[12.5px] ink2">Beta, size and AI purity are starting estimates. Correct them here and they feed the score on the next Run.</p>
          </div>
          <input className="input !w-64" placeholder="Search ticker, name or thesis…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <AddCompany store={store} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-[13px] num min-w-[900px]">
          <thead>
            <tr className="text-left label border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Thesis nodes</th>
              <th className="px-3 py-2 w-20">β est.</th>
              <th className="px-3 py-2 w-24">Size</th>
              <th className="px-3 py-2 w-20">AI %</th>
              <th className="px-3 py-2 w-16">US</th>
              <th className="px-3 py-2 text-right">Target</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const r = rank.get(c.ticker)
              return (
                <tr key={c.ticker} className="border-b last:border-0 align-top" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-3 py-2 muted">{r?.i ?? '–'}</td>
                  <td className="px-3 py-2">
                    <a className="link font-semibold" href={quoteUrl(c.yahoo)} target="_blank" rel="noreferrer">{c.ticker}</a>
                    <div className="text-[12px] ink2">{c.name}</div>
                    {c.note && <div className="text-[11.5px]" style={{ color: 'var(--warn)' }}>{c.note}</div>}
                  </td>
                  <td className="px-3 py-2 text-[12px]">
                    {c.exposures.map((e) => (
                      <div key={e.nodeId}>
                        <button className="link" onClick={() => onOpenNode(e.nodeId)}>
                          {pathTo(idx, e.nodeId).slice(-2).map((n) => n.label).join(' › ')}
                        </button>
                        <span className="muted"> · {e.role}</span>
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-2"><input className="input" type="number" step="0.1" value={c.beta} onChange={(e) => setCo(c.ticker, { beta: Number(e.target.value) })} /></td>
                  <td className="px-3 py-2">
                    <select className="input" value={c.cap} onChange={(e) => setCo(c.ticker, { cap: e.target.value as CapSize })}>
                      <option value="mega">Mega</option><option value="large">Large</option><option value="mid">Mid</option><option value="small">Small</option>
                    </select>
                  </td>
                  <td className="px-3 py-2"><input className="input" type="number" step="5" min={0} max={100} value={Math.round(c.purity * 100)} onChange={(e) => setCo(c.ticker, { purity: Number(e.target.value) / 100 })} /></td>
                  <td className="px-3 py-2"><input type="checkbox" style={{ accentColor: 'var(--accent)' }} checked={c.usListed} onChange={(e) => setCo(c.ticker, { usListed: e.target.checked })} /></td>
                  <td className="px-3 py-2 text-right">{target.get(c.ticker) ? usdK(target.get(c.ticker)!) : <span className="muted">–</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AddCompany({ store }: { store: Store }) {
  const { state, update } = store
  const [f, setF] = useState({ ticker: '', name: '', nodeId: '', role: '' })
  const nodes = [...state.nodes].sort((a, b) => a.label.localeCompare(b.label))
  return (
    <form className="flex flex-wrap gap-2 items-end" onSubmit={(e) => {
      e.preventDefault()
      const t = f.ticker.trim().toUpperCase()
      if (!t || !f.nodeId) return
      update((s) => {
        const ex = s.companies.find((c) => c.ticker === t)
        const exposure = { nodeId: f.nodeId, role: f.role || 'Added manually' }
        if (ex) return { companies: s.companies.map((c) => (c.ticker === t ? { ...c, exposures: [...c.exposures.filter((x) => x.nodeId !== f.nodeId), exposure] } : c)) }
        return { companies: [...s.companies, { ticker: t, name: f.name || t, yahoo: t, usListed: true, beta: 1.5, cap: 'mid', purity: 0.5, exposures: [exposure], origin: 'user' }] }
      })
      setF({ ticker: '', name: '', nodeId: f.nodeId, role: '' })
    }}>
      <input className="input !w-24" placeholder="Ticker" value={f.ticker} onChange={(e) => setF({ ...f, ticker: e.target.value })} />
      <input className="input !w-44" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <select className="input !w-56" value={f.nodeId} onChange={(e) => setF({ ...f, nodeId: e.target.value })}>
        <option value="">Thesis node…</option>
        {nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
      </select>
      <input className="input !w-56" placeholder="Role (why it's in this node)" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} />
      <button className="btn" type="submit" disabled={!f.ticker || !f.nodeId}><Plus size={14} /> Add company</button>
    </form>
  )
}
