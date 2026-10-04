import type { ThesisNode } from '../types'

export interface TreeIndex {
  byId: Map<string, ThesisNode>
  children: Map<string | null, ThesisNode[]>
  depth: Map<string, number>
  maxDepth: number
  /** Effective conviction: 0 if the node or any ancestor is switched off. */
  active: Map<string, boolean>
}

export function indexTree(nodes: ThesisNode[]): TreeIndex {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const children = new Map<string | null, ThesisNode[]>()
  for (const n of nodes) {
    const key = n.parentId && byId.has(n.parentId) ? n.parentId : null
    if (!children.has(key)) children.set(key, [])
    children.get(key)!.push(n)
  }
  const depth = new Map<string, number>()
  const active = new Map<string, boolean>()
  let maxDepth = 0
  const walk = (n: ThesisNode, d: number, parentActive: boolean) => {
    depth.set(n.id, d)
    maxDepth = Math.max(maxDepth, d)
    const on = parentActive && n.conviction > 0
    active.set(n.id, on)
    for (const c of children.get(n.id) ?? []) walk(c, d + 1, on)
  }
  for (const r of children.get(null) ?? []) walk(r, 0, true)
  return { byId, children, depth, maxDepth, active }
}

export function pathTo(idx: TreeIndex, id: string): ThesisNode[] {
  const out: ThesisNode[] = []
  let cur = idx.byId.get(id)
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    out.unshift(cur)
    cur = cur.parentId ? idx.byId.get(cur.parentId) : undefined
  }
  return out
}

/** The level-1 ancestor of a node (its top-level thesis branch). */
export function branchOf(idx: TreeIndex, id: string): string {
  const p = pathTo(idx, id)
  return (p[1] ?? p[0])?.id ?? id
}

export function descendants(idx: TreeIndex, id: string): string[] {
  const out: string[] = []
  const stack = [...(idx.children.get(id) ?? [])]
  while (stack.length) {
    const n = stack.pop()!
    out.push(n.id)
    stack.push(...(idx.children.get(n.id) ?? []))
  }
  return out
}
