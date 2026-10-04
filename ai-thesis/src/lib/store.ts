import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_COMPANIES } from '../data/companies'
import { DEFAULT_NODES } from '../data/thesis'
import { runPlan } from '../engine/allocate'
import type { Company, PlanResult, Position, Settings, ThesisNode } from '../types'

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
}

const KEY = 'ai-thesis-portfolio:v1'

function load(): AppState {
  const fresh: AppState = {
    nodes: DEFAULT_NODES,
    companies: DEFAULT_COMPANIES,
    positions: [],
    settings: DEFAULT_SETTINGS,
    apiKey: '',
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
        : { nodes: DEFAULT_NODES, companies: DEFAULT_COMPANIES, positions: [], settings: DEFAULT_SETTINGS, apiKey: s.apiKey },
    )
  }, [])

  return { state, plan, stale, run, update, updateNode, updateSettings, reset }
}

export type Store = ReturnType<typeof useAppState>
