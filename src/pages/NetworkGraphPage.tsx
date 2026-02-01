import { useState, useMemo } from 'react'
import { mockControls } from '../data/mockControls'
import { mockSystems } from '../data/mockSystems'
import { mockRisks } from '../data/mockRisks'
import { mockProcesses } from '../data/mockProcesses'
import { mockFSLineItems } from '../data/mockFSLineItems'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Select } from '../components/ui/select'

type NodeType = 'control' | 'system' | 'risk' | 'process' | 'fs'

interface Node {
  id: string
  label: string
  type: NodeType
  x: number
  y: number
}

interface Edge {
  from: string
  to: string
}

export default function NetworkGraphPage() {
  const [selectedControl, setSelectedControl] = useState<string>(mockControls[0].id)
  const [zoomLevel, setZoomLevel] = useState(1)

  const { nodes, edges } = useMemo(() => {
    const control = mockControls.find((c) => c.id === selectedControl)
    if (!control) return { nodes: [], edges: [] }

    const nodes: Node[] = []
    const edges: Edge[] = []

    // Center node - the control
    nodes.push({
      id: control.id,
      label: control.id,
      type: 'control',
      x: 400,
      y: 300,
    })

    // Systems - positioned to the right
    const systems = mockSystems.filter((s) => control.systemIds.includes(s.id))
    systems.forEach((system, idx) => {
      const angle = (Math.PI * 2 * idx) / systems.length - Math.PI / 2
      nodes.push({
        id: system.id,
        label: system.name,
        type: 'system',
        x: 400 + Math.cos(angle) * 200,
        y: 300 + Math.sin(angle) * 200,
      })
      edges.push({ from: control.id, to: system.id })
    })

    // Risks - positioned to the left
    const risks = mockRisks.filter((r) => control.riskIds.includes(r.id))
    risks.forEach((risk, idx) => {
      const angle = Math.PI + (Math.PI * 2 * idx) / risks.length - Math.PI / 2
      nodes.push({
        id: risk.id,
        label: risk.name,
        type: 'risk',
        x: 400 + Math.cos(angle) * 200,
        y: 300 + Math.sin(angle) * 200,
      })
      edges.push({ from: control.id, to: risk.id })
    })

    // Processes - positioned at top
    const processes = mockProcesses.filter((p) => control.processIds.includes(p.id))
    processes.forEach((process, idx) => {
      const angle = -Math.PI / 2 + ((Math.PI / 3) * (idx - (processes.length - 1) / 2)) / processes.length
      nodes.push({
        id: process.id,
        label: process.name,
        type: 'process',
        x: 400 + Math.cos(angle) * 180,
        y: 300 + Math.sin(angle) * 180,
      })
      edges.push({ from: control.id, to: process.id })
    })

    // FS Items - positioned at bottom
    const fsItems = mockFSLineItems.filter((fs) => control.fsLineItemIds.includes(fs.id))
    fsItems.forEach((fs, idx) => {
      const angle = Math.PI / 2 + ((Math.PI / 3) * (idx - (fsItems.length - 1) / 2)) / fsItems.length
      nodes.push({
        id: fs.id,
        label: fs.name,
        type: 'fs',
        x: 400 + Math.cos(angle) * 180,
        y: 300 + Math.sin(angle) * 180,
      })
      edges.push({ from: control.id, to: fs.id })
    })

    return { nodes, edges }
  }, [selectedControl])

  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case 'control':
        return '#000000'
      case 'system':
        return '#525252'
      case 'risk':
        return '#737373'
      case 'process':
        return '#a3a3a3'
      case 'fs':
        return '#525252'
      default:
        return '#d4d4d4'
    }
  }

  const getNodeLabel = (type: NodeType) => {
    switch (type) {
      case 'control':
        return 'Control'
      case 'system':
        return 'System'
      case 'risk':
        return 'Risk'
      case 'process':
        return 'Process'
      case 'fs':
        return 'FS Line Item'
      default:
        return ''
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Relationship Network Graph</h1>
        <p className="text-muted-foreground">
          Visualize connections between controls and related entities
        </p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-6">
        <Card className="col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Network Visualization</CardTitle>
              <div className="flex gap-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2))}
                  className="px-3 py-1 text-sm border border-border hover:bg-muted"
                >
                  Zoom In
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.5))}
                  className="px-3 py-1 text-sm border border-border hover:bg-muted"
                >
                  Zoom Out
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 overflow-auto" style={{ height: '600px' }}>
              <svg
                width={800 * zoomLevel}
                height={600 * zoomLevel}
                viewBox="0 0 800 600"
                style={{ margin: 'auto', display: 'block' }}
              >
                {/* Draw edges first (so they appear behind nodes) */}
                {edges.map((edge, idx) => {
                  const fromNode = nodes.find((n) => n.id === edge.from)
                  const toNode = nodes.find((n) => n.id === edge.to)
                  if (!fromNode || !toNode) return null

                  return (
                    <line
                      key={idx}
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke="#d4d4d4"
                      strokeWidth="2"
                    />
                  )
                })}

                {/* Draw nodes */}
                {nodes.map((node) => (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.type === 'control' ? 40 : 30}
                      fill={getNodeColor(node.type)}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x={node.x}
                      y={node.y + (node.type === 'control' ? 55 : 45)}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#000000"
                      fontWeight={node.type === 'control' ? 'bold' : 'normal'}
                    >
                      {node.label.length > 20
                        ? node.label.substring(0, 17) + '...'
                        : node.label}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + (node.type === 'control' ? 70 : 60)}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#737373"
                    >
                      {getNodeLabel(node.type)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Select Control</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedControl}
                onChange={(e) => setSelectedControl(e.target.value)}
              >
                {mockControls.map((control) => (
                  <option key={control.id} value={control.id}>
                    {control.id} - {control.name.substring(0, 20)}
                    {control.name.length > 20 ? '...' : ''}
                  </option>
                ))}
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6"
                  style={{ backgroundColor: getNodeColor('control') }}
                />
                <span className="text-sm">Control (Center)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6"
                  style={{ backgroundColor: getNodeColor('system') }}
                />
                <span className="text-sm">Systems</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6"
                  style={{ backgroundColor: getNodeColor('risk') }}
                />
                <span className="text-sm">Risks</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6"
                  style={{ backgroundColor: getNodeColor('process') }}
                />
                <span className="text-sm">Processes</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6"
                  style={{ backgroundColor: getNodeColor('fs') }}
                />
                <span className="text-sm">FS Line Items</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Nodes:</span>
                <span className="font-medium">{nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connections:</span>
                <span className="font-medium">{edges.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Systems:</span>
                <span className="font-medium">
                  {nodes.filter((n) => n.type === 'system').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risks:</span>
                <span className="font-medium">
                  {nodes.filter((n) => n.type === 'risk').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processes:</span>
                <span className="font-medium">
                  {nodes.filter((n) => n.type === 'process').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">FS Items:</span>
                <span className="font-medium">
                  {nodes.filter((n) => n.type === 'fs').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
