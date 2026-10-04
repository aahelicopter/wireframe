import { useEffect, useMemo, useRef } from 'react'
import type { ThesisNode } from '../types'
import { indexTree } from '../engine/tree'
import { branchColors, usdK } from '../lib/format'

const COL_W = 236
const NODE_W = 200
const NODE_H = 62
const ROW_H = 76
const PAD = 16

interface Props {
  nodes: ThesisNode[]
  allocation: Record<string, number>
  investable: number
  selectedId: string | null
  highlight: Set<string>
  collapsed: Set<string>
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}

interface Placed {
  node: ThesisNode
  x: number
  y: number
  depth: number
  hasChildren: boolean
}

export function ThesisTree({ nodes, allocation, investable, selectedId, highlight, collapsed, onSelect, onToggle }: Props) {
  const idx = useMemo(() => indexTree(nodes), [nodes])
  const colors = useMemo(() => branchColors(nodes), [nodes])
  const svgRef = useRef<SVGSVGElement>(null)

  // Keep the selected node (and a little of its children) in view.
  useEffect(() => {
    const el = svgRef.current?.querySelector(`[data-id="${CSS.escape(selectedId ?? '')}"]`)
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [selectedId, collapsed])

  const { placed, edges, width, height } = useMemo(() => {
    const placed: Placed[] = []
    const edges: { from: Placed; to: Placed }[] = []
    let row = 0
    const layout = (n: ThesisNode, depth: number): Placed => {
      const kids = idx.children.get(n.id) ?? []
      const open = !collapsed.has(n.id)
      const childPlaced = open ? kids.map((k) => layout(k, depth + 1)) : []
      let y: number
      if (childPlaced.length) {
        y = (childPlaced[0].y + childPlaced[childPlaced.length - 1].y) / 2
      } else {
        y = PAD + row * ROW_H
        row++
      }
      const p: Placed = { node: n, x: PAD + depth * COL_W, y, depth, hasChildren: kids.length > 0 }
      placed.push(p)
      for (const c of childPlaced) edges.push({ from: p, to: c })
      return p
    }
    for (const r of idx.children.get(null) ?? []) layout(r, 0)
    const maxD = Math.max(0, ...placed.map((p) => p.depth))
    return { placed, edges, width: PAD * 2 + maxD * COL_W + NODE_W, height: PAD * 2 + Math.max(1, row) * ROW_H }
  }, [idx, collapsed])

  const branchColor = (id: string) => {
    let cur = idx.byId.get(id)
    while (cur && cur.parentId && idx.byId.get(cur.parentId)?.parentId) cur = idx.byId.get(cur.parentId)
    return (cur && colors[cur.id]) || 'var(--muted)'
  }

  return (
    <svg ref={svgRef} width={width} height={height} role="tree" aria-label="Thesis tree" style={{ display: 'block' }}>
      {edges.map(({ from, to }) => {
        const share = investable > 0 ? (allocation[to.node.id] ?? 0) / investable : 0
        const sw = 1.5 + Math.min(1, share * 2.5) * 10
        const x1 = from.x + NODE_W
        const y1 = from.y + NODE_H / 2
        const x2 = to.x
        const y2 = to.y + NODE_H / 2
        const mx = (x1 + x2) / 2
        const on = idx.active.get(to.node.id)
        return (
          <path
            key={`${from.node.id}-${to.node.id}`}
            d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
            fill="none"
            stroke={branchColor(to.node.id)}
            strokeOpacity={on ? (share > 0 ? 0.55 : 0.25) : 0.12}
            strokeWidth={share > 0 ? sw : 1.5}
            strokeDasharray={on ? undefined : '4 4'}
          />
        )
      })}
      {placed.map((p) => {
        const n = p.node
        const on = idx.active.get(n.id)
        const alloc = allocation[n.id] ?? 0
        const share = investable > 0 ? (alloc / investable) * 100 : 0
        const sel = n.id === selectedId
        const hl = highlight.has(n.id)
        const color = branchColor(n.id)
        return (
          <g
            key={n.id}
            data-id={n.id}
            transform={`translate(${p.x},${p.y})`}
            style={{ cursor: 'pointer', opacity: on ? 1 : 0.45 }}
            onClick={() => onSelect(n.id)}
            role="treeitem"
            aria-selected={sel}
          >
            <title>{`${n.label}\n${n.summary}`}</title>
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={8}
              fill="var(--surface)"
              stroke={sel ? 'var(--accent)' : hl ? color : 'var(--border)'}
              strokeWidth={sel || hl ? 2 : 1}
            />
            <rect x={0} y={0} width={4} height={NODE_H} rx={2} fill={color} />
            <text x={14} y={20} fontSize={12.5} fontWeight={600} fill="var(--text)">
              {n.label.length > 27 ? n.label.slice(0, 26) + '…' : n.label}
            </text>
            <text x={14} y={38} fontSize={11} fill="var(--text-2)" className="num">
              {alloc > 0 ? `${usdK(alloc)} · ${share.toFixed(1)}%` : on ? 'no allocation' : 'switched off'}
            </text>
            {/* conviction dots */}
            {[0, 1, 2, 3, 4].map((i) => (
              <circle key={i} cx={14 + i * 9} cy={51} r={3} fill={i < n.conviction ? color : 'var(--border)'} />
            ))}
            <text x={64} y={54} fontSize={10} fill="var(--muted)">
              {`scarcity ${n.scarcity} · ${n.timing}`}
              {n.origin === 'ai' ? ' · AI' : n.origin === 'user' ? ' · you' : ''}
            </text>
            {p.hasChildren && (
              <g
                transform={`translate(${NODE_W - 10},${NODE_H / 2})`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle(n.id)
                }}
              >
                <circle r={9} fill="var(--surface-2)" stroke="var(--border)" />
                <text textAnchor="middle" y={4} fontSize={12} fontWeight={700} fill="var(--text-2)">
                  {collapsed.has(n.id) ? '+' : '−'}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
