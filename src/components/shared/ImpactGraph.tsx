import { useState, useRef, useEffect } from 'react'
import { Control } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { mockControls } from '../../data/mockControls'
import { mockSystems } from '../../data/mockSystems'
import { mockRisks } from '../../data/mockRisks'
import { mockProcesses } from '../../data/mockProcesses'
import { mockFSLineItems } from '../../data/mockFSLineItems'
import { ExternalLink, X } from 'lucide-react'

interface Node {
  id: string
  label: string
  type: 'control' | 'system' | 'risk' | 'process' | 'fs'
  status: 'ok' | 'warning' | 'critical'
  x: number
  y: number
  data: any // the actual entity object
}

interface Edge {
  from: string
  to: string
}

interface ImpactGraphProps {
  focusControlId?: string
  focusSystemId?: string
  issueControlId?: string
  onRequestSystemGraph?: (systemId: string) => void
}

export default function ImpactGraph({
  focusControlId,
  focusSystemId,
  issueControlId,
  onRequestSystemGraph
}: ImpactGraphProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showDetailCard, setShowDetailCard] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    // Build graph based on focus
    if (issueControlId) {
      buildIssueImpactGraph(issueControlId)
    } else if (focusControlId) {
      buildControlDependencyGraph(focusControlId)
    } else if (focusSystemId) {
      buildSystemImpactGraph(focusSystemId)
    }
  }, [focusControlId, focusSystemId, issueControlId])

  const buildIssueImpactGraph = (controlId: string) => {
    const affectedControl = mockControls.find(c => c.id === controlId)
    if (!affectedControl) return

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Center: Failed control (RED)
    newNodes.push({
      id: affectedControl.id,
      label: affectedControl.id,
      type: 'control',
      status: 'critical',
      x: 400,
      y: 250,
      data: affectedControl
    })

    // Systems this control depends on (YELLOW - at risk)
    const systems = mockSystems.filter(s => affectedControl.systemIds.includes(s.id))
    systems.forEach((system, idx) => {
      const angle = (Math.PI * 2 * idx) / systems.length
      newNodes.push({
        id: system.id,
        label: system.name,
        type: 'system',
        status: 'warning',
        x: 400 + Math.cos(angle) * 180,
        y: 250 + Math.sin(angle) * 180,
        data: system
      })
      newEdges.push({ from: affectedControl.id, to: system.id })

      // OTHER controls on this same system (YELLOW - cascade risk)
      const relatedControls = mockControls.filter(
        c => c.id !== affectedControl.id && c.systemIds.includes(system.id)
      )

      relatedControls.slice(0, 2).forEach((control, cIdx) => {
        const controlId = `${control.id}-${system.id}`
        const offsetAngle = angle + ((cIdx + 1) * Math.PI / 6)
        newNodes.push({
          id: controlId,
          label: control.id,
          type: 'control',
          status: 'warning',
          x: 400 + Math.cos(offsetAngle) * 280,
          y: 250 + Math.sin(offsetAngle) * 280,
          data: control
        })
        newEdges.push({ from: system.id, to: controlId })
      })
    })

    // Exposed risks (RED)
    const risks = mockRisks.filter(r => affectedControl.riskIds.includes(r.id))
    risks.forEach((risk, idx) => {
      const angle = Math.PI + (Math.PI * 2 * idx) / risks.length
      newNodes.push({
        id: risk.id,
        label: risk.name.substring(0, 20),
        type: 'risk',
        status: 'critical',
        x: 400 + Math.cos(angle) * 200,
        y: 250 + Math.sin(angle) * 200,
        data: risk
      })
      newEdges.push({ from: affectedControl.id, to: risk.id })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const buildControlDependencyGraph = (controlId: string) => {
    const control = mockControls.find(c => c.id === controlId)
    if (!control) return

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Center: This control
    newNodes.push({
      id: control.id,
      label: control.id,
      type: 'control',
      status: control.effectiveness === 'EFFECTIVE' ? 'ok' : control.effectiveness === 'INEFFECTIVE' ? 'critical' : 'warning',
      x: 400,
      y: 250,
      data: control
    })

    // Systems
    const systems = mockSystems.filter(s => control.systemIds.includes(s.id))
    systems.forEach((system, idx) => {
      const angle = (Math.PI * 2 * idx) / systems.length
      newNodes.push({
        id: system.id,
        label: system.name,
        type: 'system',
        status: 'ok',
        x: 400 + Math.cos(angle) * 200,
        y: 250 + Math.sin(angle) * 200,
        data: system
      })
      newEdges.push({ from: control.id, to: system.id })
    })

    // Risks
    const risks = mockRisks.filter(r => control.riskIds.includes(r.id))
    risks.forEach((risk, idx) => {
      const baseAngle = Math.PI
      const angle = baseAngle + ((Math.PI / 2) * (idx - (risks.length - 1) / 2)) / risks.length
      newNodes.push({
        id: risk.id,
        label: risk.name.substring(0, 15),
        type: 'risk',
        status: risk.level === 'HIGH' ? 'warning' : 'ok',
        x: 400 + Math.cos(angle) * 180,
        y: 250 + Math.sin(angle) * 180,
        data: risk
      })
      newEdges.push({ from: control.id, to: risk.id })
    })

    // Processes
    const processes = mockProcesses.filter(p => control.processIds.includes(p.id))
    processes.forEach((process, idx) => {
      const baseAngle = -Math.PI / 2
      const angle = baseAngle + ((Math.PI / 3) * (idx - (processes.length - 1) / 2)) / processes.length
      newNodes.push({
        id: process.id,
        label: process.name.substring(0, 15),
        type: 'process',
        status: 'ok',
        x: 400 + Math.cos(angle) * 160,
        y: 250 + Math.sin(angle) * 160,
        data: process
      })
      newEdges.push({ from: control.id, to: process.id })
    })

    // FS Items
    const fsItems = mockFSLineItems.filter(fs => control.fsLineItemIds.includes(fs.id))
    fsItems.forEach((fs, idx) => {
      const baseAngle = Math.PI / 2
      const angle = baseAngle + ((Math.PI / 3) * (idx - (fsItems.length - 1) / 2)) / fsItems.length
      newNodes.push({
        id: fs.id,
        label: fs.name,
        type: 'fs',
        status: 'ok',
        x: 400 + Math.cos(angle) * 160,
        y: 250 + Math.sin(angle) * 160,
        data: fs
      })
      newEdges.push({ from: control.id, to: fs.id })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const buildSystemImpactGraph = (systemId: string) => {
    const system = mockSystems.find(s => s.id === systemId)
    if (!system) return

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Center: The system
    newNodes.push({
      id: system.id,
      label: system.name,
      type: 'system',
      status: 'ok',
      x: 400,
      y: 250,
      data: system
    })

    // All controls using this system
    const controls = mockControls.filter(c => c.systemIds.includes(system.id))
    controls.forEach((control, idx) => {
      const angle = (Math.PI * 2 * idx) / controls.length
      newNodes.push({
        id: control.id,
        label: control.id,
        type: 'control',
        status: control.effectiveness === 'EFFECTIVE' ? 'ok' : control.effectiveness === 'INEFFECTIVE' ? 'critical' : 'warning',
        x: 400 + Math.cos(angle) * 220,
        y: 250 + Math.sin(angle) * 220,
        data: control
      })
      newEdges.push({ from: system.id, to: control.id })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDraggedNode(nodeId)
  }

  const handleNodeClick = (node: Node, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!draggedNode) {
      setSelectedNode(node)
      setShowDetailCard(true)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedNode || !svgRef.current) return

    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 800
    const y = ((e.clientY - rect.top) / rect.height) * 500

    setNodes(prev => prev.map(node =>
      node.id === draggedNode ? { ...node, x, y } : node
    ))
  }

  const handleMouseUp = () => {
    setDraggedNode(null)
  }

  const getNodeColor = (status: string) => {
    switch (status) {
      case 'critical':
        return '#dc2626'
      case 'warning':
        return '#f59e0b'
      case 'ok':
        return '#16a34a'
      default:
        return '#6b7280'
    }
  }

  const getNodeSize = (type: string, status: string) => {
    if (status === 'critical') return 45
    if (type === 'control') return 40
    return 35
  }

  const handleViewConnections = () => {
    if (!selectedNode) return

    if (selectedNode.type === 'system' && onRequestSystemGraph) {
      onRequestSystemGraph(selectedNode.id)
    } else if (selectedNode.type === 'control') {
      buildControlDependencyGraph(selectedNode.data.id)
      setShowDetailCard(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          {issueControlId && '🔴 Issue Impact Cascade - Click nodes for details'}
          {focusControlId && '📊 Control Dependencies - Drag to reposition'}
          {focusSystemId && '⚙️ System Impact Analysis'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="border border-border bg-muted/20">
            <svg
              ref={svgRef}
              width="100%"
              height="500"
              viewBox="0 0 800 500"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={() => setShowDetailCard(false)}
            >
              {/* Draw edges */}
              {edges.map((edge, idx) => {
                const fromNode = nodes.find(n => n.id === edge.from)
                const toNode = nodes.find(n => n.id === edge.to)
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
                    strokeDasharray={fromNode.status === 'critical' || toNode.status === 'critical' ? '5,5' : '0'}
                  />
                )
              })}

              {/* Draw nodes */}
              {nodes.map(node => (
                <g
                  key={node.id}
                  onMouseDown={(e) => handleMouseDown(node.id, e)}
                  onClick={(e) => handleNodeClick(node, e)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={getNodeSize(node.type, node.status)}
                    fill={getNodeColor(node.status)}
                    stroke={selectedNode?.id === node.id ? '#000000' : '#ffffff'}
                    strokeWidth={selectedNode?.id === node.id ? '3' : '2'}
                    opacity={node.status === 'critical' ? 1 : 0.9}
                  />
                  <text
                    x={node.x}
                    y={node.y + getNodeSize(node.type, node.status) + 15}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#000000"
                    fontWeight={node.status === 'critical' ? 'bold' : 'normal'}
                    pointerEvents="none"
                  >
                    {node.label.length > 15 ? node.label.substring(0, 12) + '...' : node.label}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + getNodeSize(node.type, node.status) + 28}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#737373"
                    pointerEvents="none"
                  >
                    {node.type}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Side Detail Card */}
          {showDetailCard && selectedNode && (
            <div className="absolute right-0 top-0 w-80 bg-background border border-border shadow-lg p-4 max-h-[500px] overflow-y-auto">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedNode.type}
                    </Badge>
                    <div
                      className="w-3 h-3"
                      style={{ backgroundColor: getNodeColor(selectedNode.status) }}
                    />
                  </div>
                  <h4 className="font-semibold">{selectedNode.label}</h4>
                </div>
                <button
                  onClick={() => setShowDetailCard(false)}
                  className="p-1 hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                {selectedNode.type === 'system' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Description:</span>
                      <p className="mt-1">{selectedNode.data.description}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Criticality:</span>
                      <p className="mt-1">
                        <Badge variant="outline">{selectedNode.data.criticality}</Badge>
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Owner:</span>
                      <p className="mt-1">{selectedNode.data.owner}</p>
                    </div>
                    {selectedNode.data.vendor && (
                      <div>
                        <span className="text-muted-foreground">Vendor:</span>
                        <p className="mt-1">{selectedNode.data.vendor}</p>
                      </div>
                    )}
                  </>
                )}

                {selectedNode.type === 'control' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="mt-1">{selectedNode.data.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p className="mt-1">
                        <Badge>{selectedNode.data.status}</Badge>
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Effectiveness:</span>
                      <p className="mt-1">{selectedNode.data.effectiveness.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Owner:</span>
                      <p className="mt-1">{selectedNode.data.owner}</p>
                    </div>
                  </>
                )}

                {selectedNode.type === 'risk' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="mt-1">{selectedNode.data.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Level:</span>
                      <p className="mt-1">
                        <Badge variant={selectedNode.data.level === 'HIGH' ? 'default' : 'outline'}>
                          {selectedNode.data.level}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <p className="mt-1">{selectedNode.data.category}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Owner:</span>
                      <p className="mt-1">{selectedNode.data.owner}</p>
                    </div>
                  </>
                )}

                {selectedNode.type === 'process' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="mt-1">{selectedNode.data.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <p className="mt-1">{selectedNode.data.category}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Owner:</span>
                      <p className="mt-1">{selectedNode.data.owner}</p>
                    </div>
                  </>
                )}

                {selectedNode.type === 'fs' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="mt-1 text-lg font-semibold">
                        ${(selectedNode.data.amount / 1000000).toFixed(0)}M
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <p className="mt-1">{selectedNode.data.category}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Materiality:</span>
                      <p className="mt-1">
                        <Badge variant={selectedNode.data.materiality === 'HIGH' ? 'default' : 'outline'}>
                          {selectedNode.data.materiality}
                        </Badge>
                      </p>
                    </div>
                  </>
                )}

                {(selectedNode.type === 'system' || selectedNode.type === 'control') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleViewConnections}
                    className="w-full mt-2"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View All Connections
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground space-x-4">
              <span>💡 <strong>Drag</strong> nodes to reposition</span>
              <span>👆 <strong>Click</strong> nodes for details</span>
            </div>
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600" />
                <span>Critical</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500" />
                <span>Warning</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600" />
                <span>OK</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
