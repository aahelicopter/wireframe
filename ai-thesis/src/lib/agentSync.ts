import { useCallback, useEffect, useRef, useState } from 'react'
import type { Store } from './store'
import type { Order } from '../types'
import { applyFill } from '../engine/orders'

export interface BrokerPosition {
  ticker: string
  shares: number
  avgCost: number
}

export interface AgentLink {
  /** False when the local agent API isn't reachable (e.g. opened from a static file). */
  online: boolean
  lastAgentAt: string | null
  brokerPositions: { at: string; positions: BrokerPosition[] } | null
  log: { at: string; msg: string }[]
  token: string | null
  /** Kill switch as the server sees it (includes a .data/HALT file). */
  halt: { on: boolean; reason: string; by: string }
  setHalt: (on: boolean, reason?: string) => Promise<void>
  applyBrokerPositions: () => void
  dismissBrokerPositions: () => void
}

const POLL_MS = 15000

/**
 * Keeps the local agent API (server/agentApi.ts) in step with the app:
 * pushes orders and the latest brief, pulls back what the agent did (sent /
 * filled / failed) and applies fills to positions.
 */
export function useAgentSync(store: Store): AgentLink {
  const { state, update } = store
  const [online, setOnline] = useState(false)
  const [lastAgentAt, setLastAgentAt] = useState<string | null>(null)
  const [brokerPositions, setBrokerPositions] = useState<AgentLink['brokerPositions']>(null)
  const [log, setLog] = useState<AgentLink['log']>([])
  const [token, setToken] = useState<string | null>(null)
  const [halt, setHaltState] = useState<AgentLink['halt']>({ on: false, reason: '', by: '' })

  /** Mirror the server's switch into local state so reviews also stop proposing orders. */
  const mirrorHalt = useCallback(
    (h: AgentLink['halt']) => {
      setHaltState(h)
      update((cur) =>
        cur.trading.halted === h.on && (cur.trading.haltReason ?? '') === h.reason
          ? {}
          : { trading: { ...cur.trading, halted: h.on, haltReason: h.reason } },
      )
    },
    [update],
  )
  const clearBroker = useRef(false)

  const sync = useCallback(async () => {
    const s = store.stateRef.current
    try {
      const res = await fetch('/api/agent/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: s.orders,
          brief: s.review.brief && s.review.lastRunAt ? { at: s.review.lastRunAt, markdown: s.review.brief } : null,
          clearBrokerPositions: clearBroker.current,
          guards: { maxQuoteAgeMin: s.trading.maxQuoteAgeMin, maxDriftPct: s.trading.maxDriftPct },
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      clearBroker.current = false
      const body = (await res.json()) as { orders: Order[]; brokerPositions: AgentLink['brokerPositions']; lastAgentAt: string | null; log: AgentLink['log']; halt: AgentLink['halt'] }
      setOnline(true)
      mirrorHalt(body.halt)
      setLastAgentAt(body.lastAgentAt)
      setBrokerPositions(body.brokerPositions)
      setLog(body.log)
      // Apply agent-side changes (status, fills) to local orders and positions.
      update((cur) => {
        const server = new Map(body.orders.map((o) => [o.id, o]))
        let positions = cur.positions
        let changed = false
        const orders = cur.orders.map((o) => {
          const so = server.get(o.id)
          if (!so || so.status === o.status) return o
          if (!['sent', 'filled', 'failed', 'expired'].includes(so.status)) return o
          changed = true
          if (so.status === 'filled' && so.fill && !o.fill) positions = applyFill(positions, o, so.fill)
          return { ...o, status: so.status, fill: so.fill, note: so.note }
        })
        return changed ? { orders, positions } : {}
      })
    } catch {
      setOnline(false)
    }
  }, [store.stateRef, update, mirrorHalt])

  const setHalt = useCallback(
    async (on: boolean, reason = '') => {
      // Apply locally first so the app stops proposing even if the server is down.
      update((cur) => ({ trading: { ...cur.trading, halted: on, haltReason: reason } }))
      try {
        const res = await fetch('/api/agent/halt', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ on, reason }) })
        if (res.ok) mirrorHalt(((await res.json()) as { halt: AgentLink['halt'] }).halt)
      } catch {
        setHaltState({ on, reason, by: 'app' })
      }
    },
    [update, mirrorHalt],
  )

  // Push on every order or brief change, and poll for agent updates.
  useEffect(() => {
    void sync()
  }, [state.orders, state.review.brief, state.trading.maxQuoteAgeMin, state.trading.maxDriftPct, sync])
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === 'visible' && void sync(), POLL_MS)
    return () => clearInterval(id)
  }, [sync])
  useEffect(() => {
    fetch('/api/agent/token')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setToken(b.token))
      .catch(() => setToken(null))
  }, [])

  const applyBrokerPositions = useCallback(() => {
    if (!brokerPositions) return
    update((cur) => {
      const prev = new Map(cur.positions.map((p) => [p.ticker.trim().toUpperCase(), p]))
      return {
        positions: brokerPositions.positions
          .filter((p) => p.shares > 0)
          .map((p, i) => {
            const old = prev.get(p.ticker)
            return { id: old?.id ?? `b_${i}_${p.ticker}`, ticker: p.ticker, shares: p.shares, avgCost: p.avgCost, price: old?.price ?? p.avgCost, priceSource: old?.priceSource }
          }),
      }
    })
    clearBroker.current = true
    setBrokerPositions(null)
    setTimeout(() => void store.refreshPrices(), 0)
  }, [brokerPositions, update, store])

  const dismissBrokerPositions = useCallback(() => {
    clearBroker.current = true
    setBrokerPositions(null)
    void sync()
  }, [sync])

  return { online, lastAgentAt, brokerPositions, log, token, halt, setHalt, applyBrokerPositions, dismissBrokerPositions }
}
