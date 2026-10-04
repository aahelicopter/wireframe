import { useRef, useState } from 'react'
import type { AppState, Store } from '../lib/store'

export function SettingsView({ store }: { store: Store }) {
  const { state, update, reset } = store
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const exportJson = () => {
    const { apiKey: _omit, ...rest } = state
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
