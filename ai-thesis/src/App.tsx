import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, RefreshCw } from 'lucide-react'
import { PriceStatusButton } from './components/PriceStatus'
import { HaltBanner, KillSwitchButton } from './components/KillSwitch'
import { useAppState } from './lib/store'
import { indexTree } from './engine/tree'
import { ThesisTree } from './components/ThesisTree'
import { NodePanel } from './components/NodePanel'
import { PlanView } from './components/PlanView'
import { DeploymentView } from './components/DeploymentView'
import { PositionsView } from './components/PositionsView'
import { UniverseView } from './components/UniverseView'
import { SettingsView } from './components/SettingsView'
import { NewsView } from './components/NewsView'
import { ReviewView, isReviewDue } from './components/ReviewView'
import { useAgentSync } from './lib/agentSync'
import { runReview, type ReviewResult, type ReviewStep } from './lib/review'
import { usdK } from './lib/format'

type Tab = 'today' | 'map' | 'plan' | 'deploy' | 'news' | 'positions' | 'universe' | 'settings'
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'map', label: 'Thesis map' },
  { id: 'plan', label: 'Plan & buys' },
  { id: 'deploy', label: 'Deployment' },
  { id: 'news', label: 'News' },
  { id: 'positions', label: 'Positions' },
  { id: 'universe', label: 'Universe' },
  { id: 'settings', label: 'Settings' },
]

/** Collapsed by default: branches that aren't on the optics → InP path. */
const DEFAULT_COLLAPSED = ['memory', 'fab', 'cloud', 'accel']

export default function App() {
  const store = useAppState()
  const { state, plan, stale, run, updateSettings } = store
  const [tab, setTab] = useState<Tab>('today')
  const [selected, setSelected] = useState<string>('lasers')
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(DEFAULT_COLLAPSED))
  const [highlight, setHighlight] = useState<Set<string>>(new Set())
  const idx = useMemo(() => indexTree(state.nodes), [state.nodes])
  const selectedId = idx.byId.has(selected) ? selected : (idx.children.get(null)?.[0]?.id ?? '')

  const openNode = (id: string) => {
    // Expand every ancestor so the node is visible.
    setCollapsed((c) => {
      const next = new Set(c)
      let cur = idx.byId.get(id)
      while (cur?.parentId) {
        next.delete(cur.parentId)
        cur = idx.byId.get(cur.parentId)
      }
      return next
    })
    setSelected(id)
    setTab('map')
  }

  const agent = useAgentSync(store)
  const [reviewStep, setReviewStep] = useState<ReviewStep | null>(null)
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null)
  const startReview = async () => {
    if (reviewStep) return
    setReviewStep('prices')
    try {
      setReviewResult(await runReview(store, (st) => setReviewStep(st === 'done' ? null : st)))
    } finally {
      setReviewStep(null)
    }
  }
  // Auto-run once per app open when a review is due.
  const autoRan = useRef(false)
  useEffect(() => {
    if (autoRan.current) return
    autoRan.current = true
    if (state.review.autoRun && isReviewDue(store)) {
      setTab('today')
      void startReview()
    }
  }, [])
  const pendingOrders = state.orders.filter((o) => o.status === 'proposed').length
  const reviewDue = isReviewDue(store)

  const buys = plan.recommendations.filter((r) => r.gap > 0).length

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-[1440px] px-4 pt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="mr-auto">
            <h1 className="text-[17px] font-semibold leading-tight">AI Thesis Portfolio</h1>
            <p className="text-[12px] muted">High-beta AI, followed down the supply chain · {usdK(state.settings.capital)} over {state.settings.horizonMonths} months</p>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <span className="muted">Capital</span>
            <input className="input !w-32 num" type="number" step={10000} value={state.settings.capital}
              onChange={(e) => updateSettings({ capital: Math.max(0, Number(e.target.value)) })} />
          </label>
          <KillSwitchButton agent={agent} />
          <PriceStatusButton store={store} />
          <div className="flex items-center gap-3">
            <span className="text-[12px] muted num hidden md:inline">
              {stale ? 'Inputs changed since last run' : `Last run ${new Date(plan.ranAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ${buys} buys`}
            </span>
            <button className="btn btn-primary !px-4" onClick={run} title="Re-score the thesis and rebuild the plan">
              {stale ? <Play size={14} /> : <RefreshCw size={14} />} Run
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-[1440px] px-4 flex overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
              {t.label}
              {t.id === 'today' && (pendingOrders > 0 || reviewDue) && (
                <span className="ml-1.5 chip !py-0 num" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}>{pendingOrders > 0 ? pendingOrders : 'due'}</span>
              )}
              {t.id === 'plan' && stale && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: 'var(--warn)' }} />}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-5">
        <HaltBanner agent={agent} />
        {stale && tab !== 'settings' && tab !== 'news' && tab !== 'today' && (
          <div className="mb-4 card px-4 py-2.5 flex items-center justify-between gap-3 text-[13px]" style={{ borderColor: 'var(--warn)' }}>
            <span>You changed the thesis or settings. Hit <b>Run</b> to rebuild the plan.</span>
            <button className="btn btn-primary" onClick={run}><Play size={14} /> Run</button>
          </div>
        )}

        {tab === 'today' && (
          <ReviewView store={store} agent={agent} running={reviewStep} result={reviewResult} onRun={() => void startReview()} onOpenNode={openNode} />
        )}
        {tab === 'map' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="card overflow-auto min-w-0" style={{ maxHeight: 'calc(100vh - 150px)' }}>
              <div className="px-4 pt-3 pb-1 text-[12px] muted flex flex-wrap gap-x-4">
                <span>Click a node to read the thesis and adjust it.</span>
                <span>Line thickness = dollars flowing to that layer.</span>
                <span>Dots = conviction.</span>
              </div>
              <ThesisTree
                nodes={state.nodes}
                allocation={plan.nodeAllocation}
                investable={plan.investable}
                selectedId={selectedId}
                highlight={highlight}
                collapsed={collapsed}
                onSelect={setSelected}
                onToggle={(id) => setCollapsed((c) => {
                  const n = new Set(c)
                  if (n.has(id)) n.delete(id)
                  else n.add(id)
                  return n
                })}
              />
            </div>
            <aside className="card p-4 lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto">
              {selectedId && (
                <NodePanel key={selectedId} store={store} nodeId={selectedId} onSelect={openNode}
                  onHoverCompany={(ids) => setHighlight(new Set(ids))} />
              )}
            </aside>
          </div>
        )}
        {tab === 'plan' && <PlanView store={store} onOpenNode={openNode} />}
        {tab === 'deploy' && <DeploymentView store={store} />}
        {tab === 'news' && <NewsView store={store} onOpenNode={openNode} />}
        {tab === 'positions' && <PositionsView store={store} />}
        {tab === 'universe' && <UniverseView store={store} onOpenNode={openNode} />}
        {tab === 'settings' && <SettingsView store={store} agent={agent} />}
      </main>
    </div>
  )
}
