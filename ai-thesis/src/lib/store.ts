import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_COMPANIES } from '../data/companies'
import { DEFAULT_NODES } from '../data/thesis'
import { runPlan } from '../engine/allocate'
import type { Company, PlanResult, Position, Settings, ThesisNode } from '../types'
import { fetchQuotes, type Quote } from './prices'

export const DEFAULT_SETTINGS: Settings = {
  capital: 500_000,
  weights: { conviction: 5, bottleneck: 4, beta: 3, depth: 3, purity: 3, smallCap: 1, catalyst: 2 },
  numPositions: 20,
  maxPositionPct: 8,
  minPositionPct: 1.5,
  maxBranchPct: 40,
  cashReservePct: 5,
  concentration: 2,
  usOnly: true,
  favorHoldings: true,
  allowTrims: false,
  horizonMonths: 18,
  cadence: 'quarterly',
  frontLoad: 0.5,
  startDate: new Date().toISOString().slice(0, 10),
}

export interface AppState {
  nodes: ThesisNode[]
  companies: Company[]
  positions: Position[]
  settings: Settings
  apiKey: string
  /** Latest live quotes, keyed by app ticker. */
  quotes: Record<string, Quote>
  quotesAt: string | null
  /** Re-fetch prices every few minutes while the app is open. */
  liveRefresh: boolean
}

export interface PriceStatus {
  busy: boolean
  errors: string[]
}

const REFRESH_MS = 5 * 60 * 1000

const KEY = 'ai-thesis-portfolio:v1'

function load(): AppState {
  const fresh: AppState = {
    nodes: DEFAULT_NODES,
    companies: DEFAULT_COMPANIES,
    positions: [],
    settings: DEFAULT_SETTINGS,
    apiKey: '',
    quotes: {},
    quotesAt: null,
    liveRefresh: true,
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh
    const saved = JSON.parse(raw) as Partial<AppState>
    return {
      ...fresh,
      ...saved,
      settings: { ...DEFAULT_SETTINGS, ...saved.settings, weights: { ...DEFAULT_SETTINGS.weights, ...saved.settings?.weights } },
    }
  } catch {
    return fresh
  }
}

/** Inputs that change the plan. Used to tell when a re-run is needed. */
const planKey = (s: AppState) => JSON.stringify([s.nodes, s.companies, s.positions, s.settings])

export function useAppState() {
  const [state, setState] = useState<AppState>(load)
  const [plan, setPlan] = useState<PlanResult>(() =>
    runPlan(state.nodes, state.companies, state.positions, state.settings),
  )
  const [planInputs, setPlanInputs] = useState(() => planKey(state))

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable: keep working in memory */
    }
  }, [state])

  const run = useCallback(() => {
    setPlan(runPlan(state.nodes, state.companies, state.positions, state.settings))
    setPlanInputs(planKey(state))
  }, [state])

  const stale = useMemo(() => planKey(state) !== planInputs, [state, planInputs])

  // ---- Live prices ----
  const stateRef = useRef(state)
  stateRef.current = state
  const staleRef = useRef(stale)
  staleRef.current = stale
  const [priceStatus, setPriceStatus] = useState<PriceStatus>({ busy: false, errors: [] })
  const [runAfterRefresh, setRunAfterRefresh] = useState(false)
  const busyRef = useRef(false)

  const refreshPrices = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setPriceStatus({ busy: true, errors: [] })
    try {
      const s = stateRef.current
      const symbolOf = new Map(s.companies.map((c) => [c.ticker, c.yahoo]))
      const tickers = new Set([
        ...s.positions.map((p) => p.ticker.trim().toUpperCase()).filter(Boolean),
        ...s.companies.map((c) => c.ticker),
      ])
      const pairs = [...tickers].map((t) => [t, symbolOf.get(t) ?? t] as const)
      const { quotes, errors } = await fetchQuotes(pairs.map(([, sym]) => sym))
      const byTicker: Record<string, Quote> = {}
      for (const [t, sym] of pairs) if (quotes[sym]) byTicker[t] = quotes[sym]
      if (!Object.keys(byTicker).length) {
        setPriceStatus({ busy: false, errors: errors.length ? errors : ['No prices returned'] })
        return
      }
      const wasCurrent = !staleRef.current
      setState((prev) => ({
        ...prev,
        quotes: { ...prev.quotes, ...byTicker },
        quotesAt: new Date().toISOString(),
        positions: prev.positions.map((p) => {
          const q = byTicker[p.ticker.trim().toUpperCase()]
          return q && p.priceSource !== 'manual'
            ? { ...p, price: Math.round(q.priceUsd * 10000) / 10000, priceSource: 'live' as const }
            : p
        }),
      }))
      // If the plan was up to date, keep it that way with the new prices.
      if (wasCurrent) setRunAfterRefresh(true)
      setPriceStatus({ busy: false, errors })
    } catch (e) {
      setPriceStatus({ busy: false, errors: [e instanceof Error ? e.message : String(e)] })
    } finally {
      busyRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!runAfterRefresh) return
    setRunAfterRefresh(false)
    run()
  }, [runAfterRefresh, run])

  // Fetch on open if prices are older than the refresh interval, then on a timer.
  useEffect(() => {
    const at = stateRef.current.quotesAt
    if (!at || Date.now() - new Date(at).getTime() > REFRESH_MS) void refreshPrices()
  }, [refreshPrices])
  useEffect(() => {
    if (!state.liveRefresh) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshPrices()
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [state.liveRefresh, refreshPrices])

  const update = useCallback((patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => {
    setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }))
  }, [])

  const updateNode = useCallback((id: string, patch: Partial<ThesisNode>) => {
    setState((s) => ({ ...s, nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  }, [])

  const reset = useCallback((what: 'thesis' | 'all') => {
    setState((s) =>
      what === 'thesis'
        ? { ...s, nodes: DEFAULT_NODES, companies: DEFAULT_COMPANIES }
        : { ...s, nodes: DEFAULT_NODES, companies: DEFAULT_COMPANIES, positions: [], settings: DEFAULT_SETTINGS },
    )
  }, [])

  return { state, plan, stale, run, update, updateNode, updateSettings, reset, refreshPrices, priceStatus }
}

export type Store = ReturnType<typeof useAppState>
