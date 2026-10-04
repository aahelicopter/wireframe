import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

/**
 * Local hand-off point between the app and a trading agent (for example a
 * Claude agent with a Robinhood connection). Runs inside the Vite dev/preview
 * server and stores state in ai-thesis/.data/agent.json.
 *
 * Safety rules enforced here:
 *  - Only the app in your browser can create, approve or reject orders.
 *  - An agent can only read APPROVED, unexpired orders and report what happened
 *    (sent / filled / failed). It cannot create, resize or approve anything.
 *  - Agent calls need the bearer token shown in the app's Settings tab.
 *  - The server binds to localhost only (see vite.config.ts).
 */

type Status = 'proposed' | 'approved' | 'rejected' | 'sent' | 'filled' | 'failed' | 'expired'
interface Order {
  id: string
  ticker: string
  side: 'BUY' | 'SELL'
  qty: number
  limitPrice: number
  status: Status
  expiresAt: string
  fill?: { qty: number; avgPrice: number; at: string; brokerOrderId?: string }
  note?: string
  [k: string]: unknown
}
interface BrokerPosition {
  ticker: string
  shares: number
  avgCost: number
}
interface Store {
  token: string
  orders: Order[]
  brief: { at: string; markdown: string } | null
  brokerPositions: { at: string; positions: BrokerPosition[] } | null
  lastAgentAt: string | null
  log: { at: string; msg: string }[]
  /** Kill switch. Anyone can turn it on; only the app (or deleting .data/HALT) turns it off. */
  halt?: { on: boolean; reason: string; by: 'app' | 'agent'; at: string }
  /** Hard guards, set from the app's Settings. */
  guards?: { maxQuoteAgeMin: number; maxDriftPct: number }
  /** Last passed precheck per order: required shortly before an order may be marked sent. */
  prechecks?: Record<string, { at: string; price: number }>
}

const DEFAULT_GUARDS = { maxQuoteAgeMin: 15, maxDriftPct: 3 }
const PRECHECK_VALID_MS = 3 * 60 * 1000

function haltFile(root: string) {
  return path.join(root, '.data', 'HALT')
}

/** Effective kill-switch state: the stored switch, or a HALT file on disk. */
function haltState(root: string, s: Store): { on: boolean; reason: string; by: string } {
  if (fs.existsSync(haltFile(root))) {
    const why = fs.readFileSync(haltFile(root), 'utf8').trim()
    return { on: true, reason: why || 'HALT file present', by: 'file' }
  }
  return s.halt?.on ? { on: true, reason: s.halt.reason, by: s.halt.by } : { on: false, reason: '', by: '' }
}

/** US equity regular session, Mon-Fri 9:30-16:00 New York time. Exchange holidays aren't modeled; the broker rejects those. */
export function usMarketOpen(now = new Date()) {
  // Test-only escape hatch so the price guards can be exercised on weekends. Never set this for real trading.
  if (process.env.AI_THESIS_TEST_MARKET_OPEN === '1') return true
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  if (parts.weekday === 'Sat' || parts.weekday === 'Sun') return false
  const mins = Number(parts.hour) * 60 + Number(parts.minute)
  return mins >= 9 * 60 + 30 && mins < 16 * 60
}

const AGENT_OWNED: Status[] = ['sent', 'filled', 'failed']

function storePath(root: string) {
  return path.join(root, '.data', 'agent.json')
}

function load(root: string): Store {
  try {
    return JSON.parse(fs.readFileSync(storePath(root), 'utf8')) as Store
  } catch {
    return { token: crypto.randomBytes(18).toString('base64url'), orders: [], brief: null, brokerPositions: null, lastAgentAt: null, log: [] }
  }
}

function save(root: string, s: Store) {
  const p = storePath(root)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  const tmp = `${p}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2))
  fs.renameSync(tmp, p)
}

function expire(s: Store) {
  const now = new Date().toISOString()
  for (const o of s.orders) if (o.status === 'approved' && o.expiresAt < now) o.status = 'expired'
}

function send(res: ServerResponse, code: number, body: unknown, type = 'application/json') {
  res.statusCode = code
  res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', 'no-store')
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const c of req) {
    size += (c as Buffer).length
    if (size > 2_000_000) throw new Error('Body too large')
    chunks.push(c as Buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

/** The app's own page: the browser sets this header and other sites can't fake it. */
const fromApp = (req: IncomingMessage) => req.headers['sec-fetch-site'] === 'same-origin'

function fromAgent(req: IncomingMessage, s: Store) {
  const h = req.headers.authorization ?? ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : (req.headers['x-agent-token'] as string | undefined)
  if (!token) return false
  const a = Buffer.from(token)
  const b = Buffer.from(s.token)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function logLine(s: Store, msg: string) {
  s.log.unshift({ at: new Date().toISOString(), msg })
  s.log = s.log.slice(0, 200)
}

export function agentApi(): Plugin {
  let root = process.cwd()
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith('/api/agent/')) return next()
    const route = url.pathname.slice('/api/agent/'.length)
    const s = load(root)
    expire(s)
    const app = fromApp(req)
    const agent = fromAgent(req, s)
    try {
      // ---- App-only endpoints ----
      if (route === 'token' && req.method === 'GET') {
        if (!app) return send(res, 403, { error: 'App only' })
        save(root, s)
        return send(res, 200, { token: s.token })
      }
      if (route === 'halt' && req.method === 'PUT') {
        // App only: turn the kill switch on or off.
        if (!app) return send(res, 403, { error: 'Only the app can turn the kill switch off. Agents use POST /halt.' })
        const body = (await readBody(req)) as { on?: boolean; reason?: string }
        s.halt = { on: !!body.on, reason: String(body.reason ?? '').slice(0, 200), by: 'app', at: new Date().toISOString() }
        logLine(s, body.on ? `Kill switch ON (app)${body.reason ? `: ${body.reason}` : ''}` : 'Kill switch off (app)')
        save(root, s)
        return send(res, 200, { halt: haltState(root, s) })
      }
      if (route === 'sync' && req.method === 'PUT') {
        if (!app) return send(res, 403, { error: 'App only' })
        const body = (await readBody(req)) as { orders?: Order[]; brief?: Store['brief']; clearBrokerPositions?: boolean; guards?: Store['guards'] }
        if (body.guards) s.guards = { maxQuoteAgeMin: Number(body.guards.maxQuoteAgeMin) || 15, maxDriftPct: Number(body.guards.maxDriftPct) || 3 }
        const server = new Map(s.orders.map((o) => [o.id, o]))
        const merged: Order[] = []
        for (const o of body.orders ?? []) {
          const cur = server.get(o.id)
          // The agent owns an order once it has acted on it.
          merged.push(cur && AGENT_OWNED.includes(cur.status) ? cur : o)
          server.delete(o.id)
        }
        for (const o of server.values()) if (AGENT_OWNED.includes(o.status)) merged.push(o)
        s.orders = merged.slice(-500)
        expire(s)
        if (body.brief) s.brief = body.brief
        if (body.clearBrokerPositions) s.brokerPositions = null
        save(root, s)
        return send(res, 200, { orders: s.orders, brokerPositions: s.brokerPositions, lastAgentAt: s.lastAgentAt, log: s.log.slice(0, 20), halt: haltState(root, s) })
      }

      // ---- Agent endpoints (token, or the app itself) ----
      if (!agent && !app) return send(res, 401, { error: 'Missing or wrong agent token. Copy it from Settings → Trading agent.' })
      if (agent) s.lastAgentAt = new Date().toISOString()

      if (route === 'halt' && req.method === 'POST') {
        // Anyone with access may pull the brake; it can only be released from the app.
        const body = (await readBody(req)) as { reason?: string }
        s.halt = { on: true, reason: String(body.reason ?? 'halted by agent').slice(0, 200), by: agent ? 'agent' : 'app', at: new Date().toISOString() }
        logLine(s, `Kill switch ON (${s.halt.by}): ${s.halt.reason}`)
        save(root, s)
        return send(res, 200, { halt: haltState(root, s) })
      }
      if (route === 'status' && req.method === 'GET') {
        save(root, s)
        const h = haltState(root, s)
        return send(res, 200, {
          ok: true,
          halted: h.on,
          haltReason: h.reason || undefined,
          marketOpen: usMarketOpen(),
          guards: s.guards ?? DEFAULT_GUARDS,
          approvedOrders: s.orders.filter((o) => o.status === 'approved').length,
          briefAt: s.brief?.at ?? null,
          lastAgentAt: s.lastAgentAt,
        })
      }
      if (route === 'brief' && req.method === 'GET') {
        save(root, s)
        if (!s.brief) return send(res, 404, { error: 'No review has been run yet.' })
        // The brief is written at review time; append where each order stands now.
        const open = s.orders.filter((o) => ['proposed', 'approved', 'sent'].includes(o.status))
        const live = [
          '',
          `## Order status now (${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC)`,
          ...(['proposed', 'approved', 'sent'] as const).map(
            (st) => `- ${st}: ${open.filter((o) => o.status === st).map((o) => `${o.side} ${o.qty} ${o.ticker}`).join(', ') || 'none'}`,
          ),
        ].join('\n')
        const markdown = s.brief.markdown + live
        return url.searchParams.get('format') === 'json'
          ? send(res, 200, { ...s.brief, markdown, orders: open })
          : send(res, 200, markdown, 'text/markdown; charset=utf-8')
      }
      if (route === 'orders' && req.method === 'GET') {
        save(root, s)
        const h = haltState(root, s)
        if (h.on) {
          // Nothing to place. Ask the agent to cancel anything still working at the broker.
          return send(res, 200, {
            halted: true,
            reason: h.reason,
            instructions: 'KILL SWITCH ON. Place nothing. Cancel every order in "cancel" at the broker (cancel_equity_order), then POST /orders/{id} {"status":"failed","note":"cancelled: kill switch"} (or "filled" if it already filled).',
            orders: [],
            cancel: s.orders.filter((o) => o.status === 'sent'),
          })
        }
        const approved = s.orders.filter((o) => o.status === 'approved')
        return send(res, 200, {
          halted: false,
          marketOpen: usMarketOpen(),
          guards: s.guards ?? DEFAULT_GUARDS,
          instructions:
            'Only during regular market hours. For each order: get a live broker quote, POST /orders/{id}/precheck {"price":<ask for buys, bid for sells>,"quoteTime":"<ISO time of that quote>"} and continue only if ok=true (otherwise mark it failed with the reason). Place each order exactly as given: orderType limit (whole shares, limit_price=limitPrice) or market (fractional qty; skip if ask > limitPrice), time_in_force gfd, regular hours, ref_id = order id. Review it first and mark it failed on any broker alert. Then POST /api/agent/orders/{id} with {"status":"sent"|"filled"|"failed", "fill":{"qty":n,"avgPrice":n}, "brokerOrderId":"...", "note":"..."}. Do not place anything that is not in this list.',
          orders: approved,
        })
      }
      const pc = route.match(/^orders\/([\w-]+)\/precheck$/)
      if (pc && req.method === 'POST') {
        const o = s.orders.find((x) => x.id === pc[1])
        if (!o) return send(res, 404, { error: 'Unknown order' })
        const body = (await readBody(req)) as { price?: number; quoteTime?: string }
        const g = s.guards ?? DEFAULT_GUARDS
        const h = haltState(root, s)
        const price = Number(body.price)
        const qt = body.quoteTime ? new Date(body.quoteTime).getTime() : NaN
        const ref = Number(o.refPrice)
        const refuse = (reason: string) => {
          // A refusal cancels any earlier pass, so the latest check always wins.
          if (s.prechecks) delete s.prechecks[o.id]
          logLine(s, `Precheck refused ${o.side} ${o.ticker}: ${reason}`)
          save(root, s)
          return send(res, 200, { ok: false, reason })
        }
        if (h.on) return refuse(`kill switch on: ${h.reason}`)
        if (o.status !== 'approved') return refuse(`order is ${o.status}, not approved`)
        if (!usMarketOpen()) return refuse('market is closed (regular session only)')
        if (!(price > 0)) return refuse('no price given')
        if (!Number.isFinite(qt)) return refuse('no quote time given')
        const ageMin = (Date.now() - qt) / 60000
        if (ageMin > g.maxQuoteAgeMin) return refuse(`quote is ${ageMin.toFixed(1)} min old (max ${g.maxQuoteAgeMin})`)
        const drift = ref > 0 ? (Math.abs(price - ref) / ref) * 100 : 0
        if (drift > g.maxDriftPct) return refuse(`price ${price} moved ${drift.toFixed(1)}% from ${ref} when approved (max ${g.maxDriftPct}%)`)
        if (o.side === 'BUY' && price > o.limitPrice) return refuse(`ask ${price} is above the limit/guard ${o.limitPrice}`)
        if (o.side === 'SELL' && price < o.limitPrice) return refuse(`bid ${price} is below the limit/guard ${o.limitPrice}`)
        s.prechecks = { ...(s.prechecks ?? {}), [o.id]: { at: new Date().toISOString(), price } }
        save(root, s)
        return send(res, 200, { ok: true, validForSeconds: PRECHECK_VALID_MS / 1000 })
      }
      const m = route.match(/^orders\/([\w-]+)$/)
      if (m && req.method === 'POST') {
        const o = s.orders.find((x) => x.id === m[1])
        if (!o) return send(res, 404, { error: 'Unknown order' })
        const body = (await readBody(req)) as { status?: Status; fill?: { qty: number; avgPrice: number }; brokerOrderId?: string; note?: string }
        const to = body.status
        const allowed = (o.status === 'approved' && to && AGENT_OWNED.includes(to)) || (o.status === 'sent' && (to === 'filled' || to === 'failed'))
        if (!allowed) return send(res, 409, { error: `Can't move an order from ${o.status} to ${to}.` })
        if (to === 'sent') {
          const h = haltState(root, s)
          if (h.on) return send(res, 409, { error: `Kill switch on: ${h.reason}. Cancel it at the broker and report failed.` })
          const p = s.prechecks?.[o.id]
          if (!p || Date.now() - new Date(p.at).getTime() > PRECHECK_VALID_MS) {
            return send(res, 409, { error: 'No passing precheck in the last 3 minutes. Call POST /orders/{id}/precheck before placing.' })
          }
        }
        if (to === 'filled') {
          const f = body.fill
          if (!f || !(f.qty > 0) || !(f.avgPrice > 0)) return send(res, 400, { error: 'filled needs fill.qty and fill.avgPrice' })
          if (f.qty > o.qty * 1.0001) return send(res, 400, { error: 'Filled quantity exceeds the approved quantity.' })
          o.fill = { qty: f.qty, avgPrice: f.avgPrice, at: new Date().toISOString(), brokerOrderId: body.brokerOrderId }
        }
        o.status = to!
        if (body.note) o.note = String(body.note).slice(0, 300)
        logLine(s, `${o.side} ${o.ticker} → ${to}${o.fill ? ` ${o.fill.qty} @ ${o.fill.avgPrice}` : ''}`)
        save(root, s)
        return send(res, 200, o)
      }
      if (route === 'positions' && req.method === 'PUT') {
        if (!agent) return send(res, 403, { error: 'Agent token required' })
        const body = (await readBody(req)) as { positions?: BrokerPosition[] }
        const positions = (body.positions ?? [])
          .filter((p) => p && typeof p.ticker === 'string' && p.shares >= 0)
          .map((p) => ({ ticker: p.ticker.toUpperCase(), shares: Number(p.shares), avgCost: Number(p.avgCost) || 0 }))
        s.brokerPositions = { at: new Date().toISOString(), positions }
        logLine(s, `Broker positions synced (${positions.length})`)
        save(root, s)
        return send(res, 200, { ok: true, count: positions.length })
      }
      return send(res, 404, { error: 'Unknown endpoint' })
    } catch (e) {
      return send(res, 400, { error: e instanceof Error ? e.message : String(e) })
    }
  }

  return {
    name: 'ai-thesis-agent-api',
    configResolved(c) {
      root = c.root
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => void handler(req, res, next))
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => void handler(req, res, next))
    },
  }
}
