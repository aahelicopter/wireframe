import type { AppState } from './store'
import type { Company, ThesisNode } from '../types'
import type { AiSubNode } from './claude'
import { indexTree, descendants } from '../engine/tree'
import { slug } from './format'

function uniqueId(nodes: ThesisNode[], base: string) {
  const ids = new Set(nodes.map((n) => n.id))
  let id = slug(base)
  let i = 2
  while (ids.has(id)) id = `${slug(base)}-${i++}`
  return id
}

export interface NewCompanyInput {
  ticker: string
  name?: string
  yahoo?: string
  usListed?: boolean
  beta?: number
  cap?: Company['cap']
  purity?: number
  role: string
}

/** Add a child node, creating or linking companies as needed. */
export function addChildNode(
  s: AppState,
  parentId: string,
  node: Omit<ThesisNode, 'id' | 'parentId'>,
  companies: NewCompanyInput[],
): Partial<AppState> {
  const id = uniqueId(s.nodes, node.label)
  const nodes = [...s.nodes, { ...node, id, parentId }]
  const byTicker = new Map(s.companies.map((c) => [c.ticker, c]))
  for (const ci of companies) {
    const t = ci.ticker.trim().toUpperCase()
    if (!t) continue
    const existing = byTicker.get(t)
    if (existing) {
      if (!existing.exposures.some((e) => e.nodeId === id)) {
        byTicker.set(t, { ...existing, exposures: [...existing.exposures, { nodeId: id, role: ci.role }] })
      }
    } else {
      byTicker.set(t, {
        ticker: t,
        name: ci.name || t,
        yahoo: ci.yahoo || t,
        usListed: ci.usListed ?? true,
        beta: ci.beta ?? 1.5,
        cap: ci.cap ?? 'mid',
        purity: ci.purity ?? 0.5,
        exposures: [{ nodeId: id, role: ci.role }],
        origin: node.origin,
      })
    }
  }
  return { nodes, companies: [...byTicker.values()] }
}

export function addAiSubNodes(s: AppState, parentId: string, subs: AiSubNode[]): Partial<AppState> {
  const parent = s.nodes.find((n) => n.id === parentId)
  let cur: AppState = s
  for (const sub of subs) {
    const patch = addChildNode(
      cur,
      parentId,
      {
        label: sub.label,
        summary: sub.summary,
        bottleneck: sub.bottleneck,
        conviction: Math.max(1, (parent?.conviction ?? 3) - 1),
        scarcity: Math.min(5, Math.max(1, Math.round(sub.scarcity || 3))),
        timing: (['now', '6-12m', '12-24m'] as const).includes(sub.timing) ? sub.timing : '6-12m',
        catalysts: sub.catalysts ?? [],
        newsQuery: sub.label,
        origin: 'ai',
      },
      (sub.companies ?? []).map((c) => ({ ...c, purity: Math.min(1, Math.max(0, c.purity)) })),
    )
    cur = { ...cur, ...patch }
  }
  return { nodes: cur.nodes, companies: cur.companies }
}

/** Remove a node and its subtree. Companies left with no exposures are removed too. */
export function deleteNode(s: AppState, id: string): Partial<AppState> {
  const idx = indexTree(s.nodes)
  const gone = new Set([id, ...descendants(idx, id)])
  const nodes = s.nodes.filter((n) => !gone.has(n.id))
  const companies = s.companies
    .map((c) => ({ ...c, exposures: c.exposures.filter((e) => !gone.has(e.nodeId)) }))
    .filter((c) => c.exposures.length > 0)
  return { nodes, companies }
}
