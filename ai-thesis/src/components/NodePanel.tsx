import { useMemo, useState } from 'react'
import { ChevronRight, Loader2, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { Store } from '../lib/store'
import type { Timing } from '../types'
import { indexTree, pathTo } from '../engine/tree'
import { quoteUrl, usdK } from '../lib/format'
import { describeError, digDeeper, type AiSubNode } from '../lib/claude'
import { addAiSubNodes, addChildNode, deleteNode } from '../lib/mutations'
import { NewsBox } from './NewsBox'

interface Props {
  store: Store
  nodeId: string
  onSelect: (id: string) => void
  onHoverCompany: (nodeIds: string[]) => void
}

export function NodePanel({ store, nodeId, onSelect, onHoverCompany }: Props) {
  const { state, plan, updateNode, update } = store
  const idx = useMemo(() => indexTree(state.nodes), [state.nodes])
  const node = idx.byId.get(nodeId)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [ai, setAi] = useState<{ busy: boolean; err: string; subs: AiSubNode[] | null }>({ busy: false, err: '', subs: null })

  if (!node) return null
  const path = pathTo(idx, node.id)
  const kids = idx.children.get(node.id) ?? []
  const recByTicker = new Map(plan.recommendations.map((r) => [r.ticker, r]))
  const rank = new Map(plan.ranked.map((s, i) => [s.company.ticker, i + 1]))
  const members = state.companies
    .filter((c) => c.exposures.some((e) => e.nodeId === node.id))
    .sort((a, b) => (rank.get(a.ticker) ?? 999) - (rank.get(b.ticker) ?? 999))

  const runDig = async () => {
    setAi({ busy: true, err: '', subs: null })
    try {
      const subs = await digDeeper(
        state.apiKey,
        path.map((p) => p.label),
        `${node.summary} Bottleneck: ${node.bottleneck}`,
        state.companies.map((c) => c.ticker),
      )
      setAi({ busy: false, err: '', subs })
    } catch (e) {
      setAi({ busy: false, err: describeError(e), subs: null })
    }
  }

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-center gap-1 text-[12px] muted">
        {path.map((p, i) => (
          <span key={p.id} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} />}
            <button className="hover:underline" onClick={() => onSelect(p.id)}>{p.label}</button>
          </span>
        ))}
      </nav>

      <div>
        <div className="flex items-start justify-between gap-2">
          {editing ? (
            <input className="input text-[16px] font-semibold" value={node.label} onChange={(e) => updateNode(node.id, { label: e.target.value })} />
          ) : (
            <h2 className="text-[17px] font-semibold leading-tight">{node.label}</h2>
          )}
          <div className="flex gap-1 shrink-0">
            <button className="btn !px-2" title="Edit thesis text" onClick={() => setEditing((v) => !v)}><Pencil size={14} /></button>
            {node.parentId && (
              <button
                className="btn !px-2"
                title="Delete this node and everything below it"
                onClick={() => {
                  if (confirm(`Delete "${node.label}" and its sub-theses?`)) {
                    onSelect(node.parentId!)
                    update((s) => deleteNode(s, node.id))
                  }
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="mt-1 text-[12px] muted num">
          Level {idx.depth.get(node.id)} · target {usdK(plan.nodeAllocation[node.id] ?? 0)}
          {node.origin === 'ai' && ' · AI-generated, verify before buying'}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <label className="block"><span className="label">Why it matters</span>
            <textarea className="input mt-1" rows={4} value={node.summary} onChange={(e) => updateNode(node.id, { summary: e.target.value })} />
          </label>
          <label className="block"><span className="label">Bottleneck</span>
            <textarea className="input mt-1" rows={2} value={node.bottleneck} onChange={(e) => updateNode(node.id, { bottleneck: e.target.value })} />
          </label>
          <label className="block"><span className="label">Catalysts (one per line)</span>
            <textarea className="input mt-1" rows={3} value={node.catalysts.join('\n')} onChange={(e) => updateNode(node.id, { catalysts: e.target.value.split('\n') })} />
          </label>
          <label className="block"><span className="label">News search terms</span>
            <input className="input mt-1" value={node.newsQuery} onChange={(e) => updateNode(node.id, { newsQuery: e.target.value })} />
          </label>
        </div>
      ) : (
        <div className="space-y-3 text-[13.5px] leading-relaxed">
          <p>{node.summary}</p>
          <div>
            <div className="label mb-0.5">Bottleneck</div>
            <p className="ink2">{node.bottleneck}</p>
          </div>
          {node.catalysts.filter(Boolean).length > 0 && (
            <div>
              <div className="label mb-0.5">Catalysts to watch</div>
              <ul className="list-disc pl-5 ink2">
                {node.catalysts.filter(Boolean).map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="card p-3 space-y-3">
        <div className="label">Adjust this thesis</div>
        <Slider label="Conviction" value={node.conviction} min={0} max={5}
          hint={node.conviction === 0 ? 'Off: this node and everything below it are excluded' : undefined}
          onChange={(v) => updateNode(node.id, { conviction: v })} />
        <Slider label="Scarcity / bottleneck" value={node.scarcity} min={1} max={5} onChange={(v) => updateNode(node.id, { scarcity: v })} />
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span>Catalyst timing</span>
          <select className="input !w-auto" value={node.timing} onChange={(e) => updateNode(node.id, { timing: e.target.value as Timing })}>
            <option value="now">Now</option>
            <option value="6-12m">6-12 months</option>
            <option value="12-24m">12-24 months</option>
          </select>
        </div>
        <p className="text-[11.5px] muted">Changes apply when you hit Run.</p>
      </div>

      <div>
        <div className="label mb-1.5">Companies in this node ({members.length})</div>
        <div className="space-y-1">
          {members.length === 0 && <p className="text-[13px] muted">No companies yet. Dig deeper or add a sub-thesis.</p>}
          {members.map((c) => {
            const r = recByTicker.get(c.ticker)
            const role = c.exposures.find((e) => e.nodeId === node.id)?.role
            return (
              <div
                key={c.ticker}
                className="flex items-start justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--surface-2)]"
                onMouseEnter={() => onHoverCompany(c.exposures.map((e) => e.nodeId))}
                onMouseLeave={() => onHoverCompany([])}
              >
                <div className="min-w-0">
                  <a className="font-semibold text-[13px] link" href={quoteUrl(c.yahoo)} target="_blank" rel="noreferrer">{c.ticker}</a>
                  <span className="text-[12px] muted"> {c.name}{!c.usListed && ' · non-US'}</span>
                  <div className="text-[12px] ink2 leading-snug">{role}</div>
                </div>
                <div className="text-right text-[12px] num shrink-0">
                  <div>β {c.beta.toFixed(1)} · #{rank.get(c.ticker) ?? '–'}</div>
                  {r && r.targetValue > 0 ? <div className="font-semibold">{usdK(r.targetValue)}</div> : <div className="muted">not in plan</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {kids.length > 0 && (
        <div>
          <div className="label mb-1.5">Goes deeper into</div>
          <div className="flex flex-wrap gap-1.5">
            {kids.map((k) => (
              <button key={k.id} className="chip hover:underline" onClick={() => onSelect(k.id)}>{k.label}</button>
            ))}
          </div>
        </div>
      )}

      <div className="card p-3 space-y-2">
        <div className="label">Go one level deeper</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={!state.apiKey || ai.busy} onClick={runDig}
            title={state.apiKey ? '' : 'Add an Anthropic API key in Settings'}>
            {ai.busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {ai.busy ? 'Researching… (can take a minute)' : 'Dig deeper with AI'}
          </button>
          <button className="btn" onClick={() => setAdding((v) => !v)}><Plus size={14} /> Add sub-thesis</button>
        </div>
        {!state.apiKey && <p className="text-[11.5px] muted">AI digging needs an Anthropic API key (Settings tab). Manual sub-theses always work.</p>}
        {ai.err && <p className="text-[12px]" style={{ color: 'var(--bad)' }}>{ai.err}</p>}
        {ai.subs && (
          <div className="space-y-2 pt-1">
            {ai.subs.map((s, i) => (
              <div key={i} className="rounded-md border p-2 text-[12.5px]" style={{ borderColor: 'var(--border)' }}>
                <div className="flex justify-between gap-2">
                  <div className="font-semibold">{s.label}</div>
                  <button className="link text-[12px] shrink-0" onClick={() => {
                    update((st) => addAiSubNodes(st, node.id, [s]))
                    setAi((a) => ({ ...a, subs: a.subs?.filter((_, j) => j !== i) ?? null }))
                  }}>+ Add</button>
                </div>
                <p className="ink2 mt-0.5">{s.summary}</p>
                <p className="muted mt-0.5">Bottleneck: {s.bottleneck}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {s.companies.map((c) => <span key={c.ticker} className="chip" title={c.role}>{c.ticker}</span>)}
                </div>
              </div>
            ))}
            {ai.subs.length > 1 && (
              <button className="btn" onClick={() => {
                update((st) => addAiSubNodes(st, node.id, ai.subs!))
                setAi((a) => ({ ...a, subs: null }))
              }}>Add all {ai.subs.length}</button>
            )}
          </div>
        )}
        {adding && <AddSubThesis onAdd={(label, summary, bottleneck, tickers) => {
          update((st) => addChildNode(st, node.id, {
            label, summary, bottleneck, conviction: 3, scarcity: 3, timing: '6-12m', catalysts: [], newsQuery: label, origin: 'user',
          }, tickers.map((t) => ({ ticker: t.ticker, role: t.role }))))
          setAdding(false)
        }} />}
      </div>

      <div>
        <div className="label mb-1.5">News & research</div>
        <NewsBox
          apiKey={state.apiKey}
          subject={`${node.label} (${node.newsQuery})`}
          context={`${path.map((p) => p.label).join(' → ')}. ${node.summary}`}
          query={node.newsQuery}
        />
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, hint, onChange }: { label: string; value: number; min: number; max: number; hint?: string; onChange: (v: number) => void }) {
  return (
    <label className="block text-[13px]">
      <div className="flex justify-between"><span>{label}</span><span className="num font-semibold">{value}</span></div>
      <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <div className="text-[11.5px]" style={{ color: 'var(--warn)' }}>{hint}</div>}
    </label>
  )
}

function AddSubThesis({ onAdd }: { onAdd: (label: string, summary: string, bottleneck: string, tickers: { ticker: string; role: string }[]) => void }) {
  const [label, setLabel] = useState('')
  const [summary, setSummary] = useState('')
  const [bottleneck, setBottleneck] = useState('')
  const [tickers, setTickers] = useState('')
  return (
    <form className="space-y-2 pt-1" onSubmit={(e) => {
      e.preventDefault()
      if (!label.trim()) return
      onAdd(label.trim(), summary.trim(), bottleneck.trim(),
        tickers.split(',').map((t) => t.trim()).filter(Boolean).map((t) => {
          const [ticker, ...role] = t.split(':')
          return { ticker: ticker.trim(), role: role.join(':').trim() || label.trim() }
        }))
    }}>
      <input className="input" placeholder="Sub-thesis, e.g. Germanium for photodetectors" value={label} onChange={(e) => setLabel(e.target.value)} />
      <textarea className="input" rows={2} placeholder="Why it matters" value={summary} onChange={(e) => setSummary(e.target.value)} />
      <input className="input" placeholder="Bottleneck" value={bottleneck} onChange={(e) => setBottleneck(e.target.value)} />
      <input className="input" placeholder="Tickers, e.g. AXTI: substrates, COHR" value={tickers} onChange={(e) => setTickers(e.target.value)} />
      <p className="text-[11.5px] muted">New tickers start with β 1.5, mid-cap, 50% purity. Fine-tune them in the Universe tab.</p>
      <button className="btn btn-primary" type="submit">Add</button>
    </form>
  )
}
