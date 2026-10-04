import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import type { Store } from '../lib/store'
import { gather, googleNews, secFilings, yahooHeadlines, type Headline } from '../lib/news'
import { HeadlineList } from './NewsBox'

type Filter = 'all' | 'holdings' | 'plan' | 'themes' | 'filings'

/** Free, keyless feed across holdings, planned buys and thesis themes. */
export function NewsView({ store, onOpenNode }: { store: Store; onOpenNode: (id: string) => void }) {
  const { state, plan } = store
  const [items, setItems] = useState<Headline[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')

  const companies = useMemo(() => new Map(state.companies.map((c) => [c.ticker, c])), [state.companies])
  const held = useMemo(
    () => new Set(state.positions.map((p) => p.ticker.trim().toUpperCase()).filter(Boolean)),
    [state.positions],
  )
  const planned = useMemo(
    () => plan.recommendations.filter((r) => r.targetValue > 0).map((r) => r.ticker),
    [plan.recommendations],
  )
  // Themes: the thesis nodes getting the most money (excluding the root).
  const themes = useMemo(
    () =>
      Object.entries(plan.nodeAllocation)
        .map(([id, v]) => ({ node: state.nodes.find((n) => n.id === id), v }))
        .filter((x) => x.node && x.node.parentId)
        .sort((a, b) => b.v - a.v)
        .slice(0, 8)
        .map((x) => x.node!),
    [plan.nodeAllocation, state.nodes],
  )

  const load = useCallback(async () => {
    setLoading(true)
    const tickers = [...new Set([...held, ...planned])]
    const tag = (t: string, f: () => Promise<Headline[]>) => async () => (await f()).map((h) => ({ ...h, tag: t }))
    const loaders = [
      ...tickers.map((t) => tag(t, () => yahooHeadlines(companies.get(t)?.yahoo ?? t))),
      ...themes.map((n) => tag(n.label, () => googleNews(n.newsQuery, 14))),
      // Filings only for US names you hold, to keep the request count down.
      ...[...held].filter((t) => companies.get(t)?.usListed ?? true).map((t) => tag(t, () => secFilings(t))),
    ]
    const r = await gather(loaders)
    setItems(r.items)
    setFailed(r.failed)
    setLoading(false)
  }, [held, planned, themes, companies])

  useEffect(() => {
    void load()
    // Load once per visit; the Refresh button reloads (feeds are cached 15 min).
  }, [])

  const themeLabels = new Set(themes.map((t) => t.label))
  const shown = items.filter((h) => {
    if (filter === 'holdings' && !(h.tag && held.has(h.tag))) return false
    if (filter === 'plan' && !(h.tag && planned.includes(h.tag))) return false
    if (filter === 'themes' && !(h.tag && themeLabels.has(h.tag))) return false
    if (filter === 'filings' && h.source !== 'sec') return false
    if (q && !`${h.title} ${h.tag} ${h.publisher}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'holdings', label: `My holdings (${held.size})` },
    { id: 'plan', label: `Planned buys (${planned.length})` },
    { id: 'themes', label: 'Thesis themes' },
    { id: 'filings', label: 'SEC filings' },
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="card p-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h3 className="text-[15px] font-semibold mr-2">Latest news</h3>
          {FILTERS.map((f) => (
            <button key={f.id} className="chip"
              style={filter === f.id ? { background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' } : undefined}
              onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
          <input className="input !w-48 ml-auto" placeholder="Filter headlines…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        </div>
        {failed > 0 && !loading && (
          <p className="text-[12px] mb-2" style={{ color: 'var(--warn)' }}>
            {failed} feed{failed > 1 ? 's' : ''} didn't respond. Showing the rest.
          </p>
        )}
        {loading && items.length === 0 ? (
          <p className="text-[13px] muted inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Pulling headlines…</p>
        ) : shown.length ? (
          <HeadlineList items={shown.slice(0, 150)} showTag />
        ) : (
          <p className="text-[13px] muted">No headlines match.</p>
        )}
      </div>

      <aside className="space-y-4">
        <div className="card p-4">
          <div className="label mb-2">Themes being tracked</div>
          <div className="flex flex-wrap gap-1.5">
            {themes.map((n) => (
              <button key={n.id} className="chip hover:underline" onClick={() => onOpenNode(n.id)} title={`Search: ${n.newsQuery}`}>{n.label}</button>
            ))}
          </div>
          <p className="text-[11.5px] muted mt-2">These are the 8 thesis layers with the most planned dollars. Change a layer's search terms by editing it on the Thesis map.</p>
        </div>
        <div className="card p-4 text-[12.5px] ink2 space-y-1.5">
          <div className="label">Sources (free, no keys)</div>
          <p><b>Yahoo Finance</b>: per-ticker headlines.</p>
          <p><b>Google News</b>: thesis-theme searches, last 14 days.</p>
          <p><b>SEC EDGAR</b>: filings for US names you hold.</p>
          <p className="muted">Cached 15 minutes. For an AI read on what a story means for the thesis, open a suggestion and click "AI thesis read". That uses your API credits.</p>
        </div>
      </aside>
    </div>
  )
}
