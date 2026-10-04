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
  /** Last price, entered by the user. Falls back to avgCost. */
  price: number
}

export type FactorKey =
  | 'conviction'
  | 'bottleneck'
  | 'beta'
  | 'depth'
  | 'purity'
  | 'smallCap'
  | 'catalyst'

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
