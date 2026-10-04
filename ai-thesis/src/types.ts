export type Timing = 'now' | '6-12m' | '12-24m'
export type CapSize = 'mega' | 'large' | 'mid' | 'small'

export interface ThesisNode {
  id: string
  parentId: string | null
  label: string
  /** Why this layer matters to the AI buildout. */
  summary: string
  /** The physical / economic constraint that creates pricing power. */
  bottleneck: string
  /** 0-5. 0 disables the node and everything beneath it. */
  conviction: number
  /** 1-5. How supply-constrained this layer is. */
  scarcity: number
  /** When the main catalyst is expected to show up in numbers. */
  timing: Timing
  catalysts: string[]
  /** Extra terms used for news searches on this node. */
  newsQuery: string
  /** Set on nodes the user or the AI added. */
  origin?: 'user' | 'ai'
}

export interface Exposure {
  nodeId: string
  role: string
}

export interface Company {
  ticker: string
  name: string
  /** Yahoo Finance symbol, used for quote links. */
  yahoo: string
  usListed: boolean
  /** Estimated beta vs. S&P 500. Editable. */
  beta: number
  cap: CapSize
  /** 0-1, share of the business tied to the AI buildout. */
  purity: number
  exposures: Exposure[]
  note?: string
  origin?: 'user' | 'ai'
}

export interface Position {
  id: string
  ticker: string
  shares: number
  avgCost: number
  /** Last price in USD. Filled from live quotes unless the user typed one. Falls back to avgCost. */
  price: number
  /** 'manual' prices are never overwritten by live quotes. */
  priceSource?: 'live' | 'manual'
}

export type FactorKey =
  | 'conviction'
  | 'bottleneck'
  | 'beta'
  | 'depth'
  | 'purity'
  | 'smallCap'
  | 'catalyst'
  | 'news'

export interface Settings {
  capital: number
  weights: Record<FactorKey, number>
  numPositions: number
  maxPositionPct: number
  minPositionPct: number
  maxBranchPct: number
  cashReservePct: number
  /** Exponent on the composite score. Higher = more concentrated. */
  concentration: number
  usOnly: boolean
  favorHoldings: boolean
  allowTrims: boolean
  horizonMonths: number
  cadence: 'monthly' | 'quarterly'
  /** 0-1, how much to front-load near-term catalysts. */
  frontLoad: number
  startDate: string
}

export interface ScoredCompany {
  company: Company
  score: number
  factors: Record<FactorKey, number>
  /** Best-scoring exposure, which decides the chain shown for the name. */
  primaryNodeId: string
  branchId: string
  activeExposures: Exposure[]
}

export type Action = 'BUY' | 'ADD' | 'HOLD' | 'TRIM' | 'OUTSIDE'

export interface Recommendation {
  ticker: string
  scored?: ScoredCompany
  targetPct: number
  targetValue: number
  currentValue: number
  gap: number
  action: Action
  why: string[]
}

export interface Tranche {
  index: number
  date: string
  buys: { ticker: string; amount: number }[]
  total: number
}

export interface PlanResult {
  ranAt: string
  investable: number
  outsideValue: number
  currentTotal: number
  recommendations: Recommendation[]
  ranked: ScoredCompany[]
  nodeAllocation: Record<string, number>
  branchAllocation: Record<string, number>
  tranches: Tranche[]
  totalBuys: number
  totalTrims: number
}

// ---------- News signals ----------

/** A headline Claude has scored against the thesis. Stored so it's never re-sent. */
export interface ScoredHeadline {
  id: string
  title: string
  url: string
  publisher: string
  date: string
  /** Ticker or thesis node id the headline is about. */
  subject: string
  /** -2 (thesis-breaking) .. +2 (strongly supportive). */
  impact: number
  /** 1-3, how much it matters to the thesis. */
  relevance: number
  note: string
}

/** A suggested thesis change backed by headlines. Never applied without approval. */
export interface ThesisProposal {
  id: string
  createdAt: string
  nodeId: string
  field: 'conviction' | 'scarcity'
  from: number
  to: number
  reason: string
  evidence: { title: string; url: string }[]
  status: 'pending' | 'accepted' | 'dismissed'
}

export interface Signals {
  /** -1..1 per ticker. */
  tickers: Record<string, number>
  /** -1..1 per thesis node. */
  nodes: Record<string, number>
}

// ---------- Orders & review ----------

export type OrderStatus = 'proposed' | 'approved' | 'rejected' | 'sent' | 'filled' | 'failed' | 'expired'

export interface Order {
  id: string
  createdAt: string
  side: 'BUY' | 'SELL'
  ticker: string
  /** Shares; fractional when fractional trading is on. */
  qty: number
  /** Dollar value at the reference price. */
  notional: number
  /** Price used to size the order. */
  refPrice: number
  limitPrice: number
  kind: 'tranche' | 'trim' | 'exit'
  reason: string
  status: OrderStatus
  /** Approved orders must be executed before this time or they expire. */
  expiresAt: string
  approvedAt?: string
  fill?: { qty: number; avgPrice: number; at: string; brokerOrderId?: string }
  note?: string
}

export interface Trading {
  fractional: boolean
  /** Limit price buffer vs. last price, in percent. */
  limitBufferPct: number
  /** Propose selling a holding when every thesis node it sits in is switched off. */
  exitOnThesisBreak: boolean
  /** Skip orders smaller than this. */
  minOrderUsd: number
}

export interface Review {
  /** Days between reviews. */
  cadenceDays: number
  lastRunAt: string | null
  /** Run the review automatically when the app opens and one is due. */
  autoRun: boolean
  /** Markdown brief from the last review, also served to the agent. */
  brief?: string
}

export interface AiUsage {
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  searches: number
  /** Token cost only; web search fees are extra. */
  costUsd: number
}
