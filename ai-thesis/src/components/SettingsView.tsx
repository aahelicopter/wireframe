import { useRef, useState } from 'react'
import type { AppState, Store } from '../lib/store'
import { EMPTY_USAGE } from '../lib/store'
import type { AgentLink } from '../lib/agentSync'
import { AI_MODELS, type AiModel } from '../lib/claude'

export function SettingsView({ store, agent }: { store: Store; agent: AgentLink }) {
  const { state, update, reset } = store
  const [showToken, setShowToken] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5174'
  const t = state.trading
  const setTrading = (patch: Partial<typeof t>) => update((s) => ({ trading: { ...s.trading, ...patch } }))
  const u = state.aiUsage
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const exportJson = () => {
    const { apiKey: _omit, quotes: _q, seen: _s, ...rest } = state
    void _q
    void _s
    void _omit
    const blob = new Blob([JSON.stringify(rest, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ai-thesis-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as Partial<AppState>
      if (!Array.isArray(data.nodes) || !Array.isArray(data.companies)) throw new Error('Not a thesis export')
      update({ nodes: data.nodes, companies: data.companies, positions: data.positions ?? [], ...(data.settings ? { settings: { ...state.settings, ...data.settings } } : {}) })
      setMsg('Imported. Hit Run to refresh the plan.')
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-4 space-y-3">
        <h3 className="text-[15px] font-semibold">AI research (optional)</h3>
        <p className="text-[13px] ink2">
          With an Anthropic API key, each thesis node gets <b>Dig deeper with AI</b>, which researches the web and proposes the next layer of bottlenecks and companies. Every suggestion and node also gets an <b>AI news scan</b> that returns recent articles with links.
        </p>
        <label className="block">
          <span className="label">Anthropic API key</span>
          <div className="flex gap-2 mt-1">
            <input className="input font-mono" type={show ? 'text' : 'password'} placeholder="sk-ant-…" value={state.apiKey}
              onChange={(e) => update({ apiKey: e.target.value.trim() })} />
            <button className="btn" onClick={() => setShow((v) => !v)}>{show ? 'Hide' : 'Show'}</button>
          </div>
        </label>
        <label className="block">
          <span className="label">Model</span>
          <select className="input mt-1" value={state.aiModel} onChange={(e) => update({ aiModel: e.target.value as AiModel })}>
            {AI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}: ${m.inPerM}/${m.outPerM} per M tokens</option>)}
          </select>
        </label>
        <div className="rounded-md p-2.5 text-[12px] num" style={{ background: 'var(--surface-2)' }}>
          <div className="flex justify-between"><span className="label">Usage since reset</span><button className="link" onClick={() => update({ aiUsage: EMPTY_USAGE })}>Reset</button></div>
          <div className="mt-1">{u.calls} calls · {(u.inputTokens / 1000).toFixed(1)}k in · {(u.outputTokens / 1000).toFixed(1)}k out · {u.searches} web searches</div>
          <div>≈ <b>${u.costUsd.toFixed(3)}</b> in tokens{u.searches ? ', plus web search fees' : ''}</div>
        </div>
        <p className="text-[12px] muted">
          Kept cheap on purpose: daily scoring sends headline titles only, in one batched call, and never re-sends a headline. "AI thesis read" reuses headlines already loaded. Only "Dig deeper" searches the web, at most 3 searches per run.
        </p>
        <p className="text-[12px] muted">
          The key is stored only in this browser (localStorage) and sent directly to api.anthropic.com. Use this app locally. Don't host it publicly with your key in it. Each dig or scan runs a few web searches and costs a few cents.
        </p>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="text-[15px] font-semibold">Save & restore</h3>
        <p className="text-[13px] ink2">Everything (thesis edits, universe, positions, weights) autosaves in this browser. Export a file to back it up or move it to another machine. The API key is never exported.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={exportJson}>Export JSON</button>
          <button className="btn" onClick={() => file.current?.click()}>Import JSON</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </div>
        {msg && <p className="text-[12.5px]">{msg}</p>}
        <div className="pt-2 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
          <button className="btn" onClick={() => confirm('Restore the default thesis tree and universe? Positions and weights are kept.') && reset('thesis')}>Reset thesis to default</button>
          <button className="btn" style={{ color: 'var(--bad)' }} onClick={() => confirm('Erase everything except the API key?') && reset('all')}>Reset everything</button>
        </div>
      </div>

      <div className="card p-4 space-y-3 lg:col-span-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold mr-auto">Trading agent (Robinhood or any broker)</h3>
          <span className="chip" style={{ color: agent.online ? 'var(--good)' : 'var(--bad)', borderColor: agent.online ? 'var(--good)' : 'var(--bad)' }}>{agent.online ? 'local API online' : 'local API offline'}</span>
        </div>
        <p className="text-[13px] ink2">
          This app never trades by itself. Each review proposes orders, and you approve them on the Today tab. An agent you trust (for example Claude with your Robinhood connection) then reads the <b>approved</b> orders from this app's local API, places them, and reports the fills back. Positions update automatically. The agent can't create, resize or approve orders.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 text-[13px]">
            <div className="label">Order preferences</div>
            <label className="flex items-center gap-2"><input type="checkbox" style={{ accentColor: 'var(--accent)' }} checked={t.fractional} onChange={(e) => setTrading({ fractional: e.target.checked })} /> Fractional shares</label>
            <label className="flex items-center gap-2"><input type="checkbox" style={{ accentColor: 'var(--accent)' }} checked={t.exitOnThesisBreak} onChange={(e) => setTrading({ exitOnThesisBreak: e.target.checked })} /> Propose selling a holding when its whole thesis is switched off</label>
            <label className="flex items-center justify-between gap-3">Limit buffer vs last price
              <span className="flex items-center gap-1"><input className="input !w-20 text-right" type="number" step="0.1" min={0} value={t.limitBufferPct} onChange={(e) => setTrading({ limitBufferPct: Number(e.target.value) })} />%</span>
            </label>
            <label className="flex items-center justify-between gap-3">Smallest order
              <span className="flex items-center gap-1">$<input className="input !w-24 text-right" type="number" step="50" min={0} value={t.minOrderUsd} onChange={(e) => setTrading({ minOrderUsd: Number(e.target.value) })} /></span>
            </label>
            <p className="text-[11.5px] muted">Trims only appear if "Allow trims" is on in the Plan tab.</p>
          </div>
          <div className="space-y-2 text-[13px]">
            <div className="label">Connect your agent</div>
            <div>API: <code className="text-[12px]">{origin}/api/agent/</code></div>
            <div className="flex gap-2 items-center">
              <span>Token:</span>
              <code className="text-[12px] truncate">{agent.token ? (showToken ? agent.token : '••••••••••••') : 'start the app with npm run dev'}</code>
              {agent.token && <button className="link text-[12px]" onClick={() => setShowToken((v) => !v)}>{showToken ? 'hide' : 'show'}</button>}
            </div>
            <button className="btn" disabled={!agent.token} onClick={() => void navigator.clipboard?.writeText(agentPrompt(origin, agent.token ?? ''))}>Copy agent instructions</button>
            <p className="text-[11.5px] muted">Paste the instructions into the agent that has your Robinhood connection, then schedule it to run after your review. The full protocol is in ai-thesis/AGENT.md. The API only listens on this computer (127.0.0.1).</p>
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-2 lg:col-span-2">
        <h3 className="text-[15px] font-semibold">How the model works</h3>
        <ol className="list-decimal pl-5 text-[13px] ink2 space-y-1">
          <li>Every company sits in one or more thesis nodes. A node switched to conviction 0 removes itself and everything beneath it.</li>
          <li>Each company gets 0-1 scores for conviction, bottleneck/scarcity, beta, depth below the GPU, AI purity, size and catalyst timing. Your factor weights blend them, and conviction also scales the result.</li>
          <li>The top N names get weight ∝ score<sup>concentration</sup>, then per-name and per-branch caps are applied. Names below the minimum size are dropped.</li>
          <li>Targets are compared to your positions. Gaps become Buy/Add suggestions, spread over the horizon. Holdings outside the target set are held, never sold, unless you turn on trims.</li>
        </ol>
        <p className="text-[12px] muted pt-1">
          This is a thinking tool, not financial advice. Company data are rough estimates with no live prices. Verify facts, valuation and position sizing yourself before trading.
        </p>
      </div>
    </div>
  )
}

function agentPrompt(origin: string, token: string) {
  return `You execute pre-approved stock orders for my AI thesis portfolio app. Use my brokerage connection (Robinhood).

API base: ${origin}/api/agent  (header: Authorization: Bearer ${token})

Each run:
1. GET /status. If approvedOrders is 0, stop.
2. GET /orders. For EACH order listed, and nothing else:
   - Place exactly: side, ticker, qty (fractional allowed), LIMIT price = limitPrice, time in force = day.
   - Then POST /orders/{id} with {"status":"sent","brokerOrderId":"..."}.
   - If the broker rejects it, POST {"status":"failed","note":"<reason>"}.
3. Later runs: for orders you sent, check the broker. When filled, POST {"status":"filled","fill":{"qty":<filled qty>,"avgPrice":<avg price>},"brokerOrderId":"..."}.
4. After trading, PUT /positions with {"positions":[{"ticker":"LITE","shares":12.5,"avgCost":98.2}, ...]} from my broker holdings.
5. Optionally GET /brief and send me the summary.

Rules: never place an order that isn't in GET /orders. Never change qty, side or limit. Never market orders. If anything looks wrong (price moved more than 3% from limitPrice, ticker not found), mark it failed with a note instead of improvising.`
}
