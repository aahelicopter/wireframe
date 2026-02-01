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
import { mockIssues } from '../../data/mockIssues'
import { ExternalLink, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

type ViewMode =
  | 'issue-cascade'
  | 'control-focus'
  | 'system-focus'
  | 'all-systems'
  | 'all-controls'
  | 'all-risks'
  | 'all-fs-items'
  | 'all-processes'
  | 'risk-focus'
  | 'fs-focus'
  | 'process-focus'

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
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Initialize based on props
    if (issueControlId) return 'issue-cascade'
    if (focusControlId) return 'control-focus'
    if (focusSystemId) return 'system-focus'
    return 'all-controls'
  })
  const [focusEntityId, setFocusEntityId] = useState<string | undefined>(
    issueControlId || focusControlId || focusSystemId
  )
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    // Build graph based on view mode
    switch (viewMode) {
      case 'issue-cascade':
        if (focusEntityId) buildIssueImpactGraph(focusEntityId)
        break
      case 'control-focus':
        if (focusEntityId) buildControlDependencyGraph(focusEntityId)
        break
      case 'system-focus':
        if (focusEntityId) buildSystemImpactGraph(focusEntityId)
        break
      case 'risk-focus':
        if (focusEntityId) buildRiskImpactGraph(focusEntityId)
        break
      case 'fs-focus':
        if (focusEntityId) buildFSItemImpactGraph(focusEntityId)
        break
      case 'process-focus':
        if (focusEntityId) buildProcessImpactGraph(focusEntityId)
        break
      case 'all-systems':
        buildAllSystemsGraph()
        break
      case 'all-controls':
        buildAllControlsGraph()
        break
      case 'all-risks':
        buildAllRisksGraph()
        break
      case 'all-fs-items':
        buildAllFSItemsGraph()
        break
      case 'all-processes':
        buildAllProcessesGraph()
        break
    }
  }, [viewMode, focusEntityId])

  const buildIssueImpactGraph = (controlId: string) => {
    const affectedControl = mockControls.find(c => c.id === controlId)
    if (!affectedControl) return

    // Find the issue for this control to get granular failure details
    const issue = mockIssues.find(i => i.controlId === controlId)

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

    // Get the specific systems that had the issue (granular)
    const affectedSystemIds = issue?.affectedSystemIds || affectedControl.systemIds
    const failedAttribute = issue?.failedAttribute
    const failedCapability = issue?.failedCapability

    // Ring 1: Only the SPECIFIC systems that had the issue (YELLOW - at risk)
    const affectedSystems = mockSystems.filter(s => affectedSystemIds.includes(s.id))

    affectedSystems.forEach((system, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.max(affectedSystems.length, 1)
      const systemNodeId = `system-${system.id}`
      newNodes.push({
        id: systemNodeId,
        label: `${system.name}`,
        type: 'system',
        status: 'warning',
        x: 400 + Math.cos(angle) * 180,
        y: 250 + Math.sin(angle) * 180,
        data: { ...system, failedAttribute, failedCapability }
      })
      newEdges.push({ from: affectedControl.id, to: systemNodeId })

      // Ring 2: OTHER controls that depend on this system AND the SAME attribute (GRANULAR CASCADE)
      let cascadeControls: typeof mockControls = []

      if (failedAttribute && issue) {
        // GRANULAR: Find controls that depend on this system for the SAME attribute
        cascadeControls = mockControls.filter(c => {
          if (c.id === affectedControl.id) return false

          // Check if this control has systemAttributes matching the affected system and attribute
          const hasMatchingAttribute = c.systemAttributes?.some(sa =>
            sa.systemId === system.id &&
            sa.attributes.some(attr =>
              attr === failedAttribute || attr === failedCapability
            )
          )

          return hasMatchingAttribute
        })
      } else {
        // Fallback: If no granular data, show any controls on this system (old behavior)
        cascadeControls = mockControls.filter(
          c => c.id !== affectedControl.id && c.systemIds.includes(system.id)
        )
      }

      cascadeControls.slice(0, 3).forEach((control, cIdx) => {
        const controlNodeId = `cascade-${control.id}-${system.id}-${cIdx}`
        const offsetAngle = angle + ((cIdx - 1) * Math.PI / 8)
        newNodes.push({
          id: controlNodeId,
          label: control.id,
          type: 'control',
          status: 'warning',
          x: 400 + Math.cos(offsetAngle) * 300,
          y: 250 + Math.sin(offsetAngle) * 300,
          data: control
        })
        newEdges.push({ from: systemNodeId, to: controlNodeId })
      })
    })

    // Ring 3: Exposed risks (RED)
    const risks = mockRisks.filter(r => affectedControl.riskIds.includes(r.id))
    risks.forEach((risk, idx) => {
      const angle = Math.PI + (Math.PI * 2 * idx) / Math.max(risks.length, 1)
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

  const buildRiskImpactGraph = (riskId: string) => {
    const risk = mockRisks.find(r => r.id === riskId)
    if (!risk) return

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Center: The risk
    newNodes.push({
      id: risk.id,
      label: risk.name.substring(0, 20),
      type: 'risk',
      status: risk.level === 'HIGH' ? 'warning' : 'ok',
      x: 400,
      y: 250,
      data: risk
    })

    // All controls mitigating this risk
    const controls = mockControls.filter(c => c.riskIds.includes(risk.id))
    controls.forEach((control, idx) => {
      const angle = (Math.PI * 2 * idx) / controls.length
      newNodes.push({
        id: control.id,
        label: control.id,
        type: 'control',
        status: control.effectiveness === 'EFFECTIVE' ? 'ok' : control.effectiveness === 'INEFFECTIVE' ? 'critical' : 'warning',
        x: 400 + Math.cos(angle) * 200,
        y: 250 + Math.sin(angle) * 200,
        data: control
      })
      newEdges.push({ from: risk.id, to: control.id })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const buildFSItemImpactGraph = (fsId: string) => {
    const fsItem = mockFSLineItems.find(f => f.id === fsId)
    if (!fsItem) return

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Center: The FS line item
    newNodes.push({
      id: fsItem.id,
      label: fsItem.name,
      type: 'fs',
      status: fsItem.materiality === 'HIGH' ? 'warning' : 'ok',
      x: 400,
      y: 250,
      data: fsItem
    })

    // All controls covering this FS item
    const controls = mockControls.filter(c => c.fsLineItemIds.includes(fsItem.id))
    controls.forEach((control, idx) => {
      const angle = (Math.PI * 2 * idx) / controls.length
      newNodes.push({
        id: control.id,
        label: control.id,
        type: 'control',
        status: control.effectiveness === 'EFFECTIVE' ? 'ok' : control.effectiveness === 'INEFFECTIVE' ? 'critical' : 'warning',
        x: 400 + Math.cos(angle) * 200,
        y: 250 + Math.sin(angle) * 200,
        data: control
      })
      newEdges.push({ from: fsItem.id, to: control.id })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const buildProcessImpactGraph = (processId: string) => {
    const process = mockProcesses.find(p => p.id === processId)
    if (!process) return

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Center: The process
    newNodes.push({
      id: process.id,
      label: process.name.substring(0, 15),
      type: 'process',
      status: 'ok',
      x: 400,
      y: 250,
      data: process
    })

    // All controls in this process
    const controls = mockControls.filter(c => c.processIds.includes(process.id))
    controls.forEach((control, idx) => {
      const angle = (Math.PI * 2 * idx) / controls.length
      newNodes.push({
        id: control.id,
        label: control.id,
        type: 'control',
        status: control.effectiveness === 'EFFECTIVE' ? 'ok' : control.effectiveness === 'INEFFECTIVE' ? 'critical' : 'warning',
        x: 400 + Math.cos(angle) * 200,
        y: 250 + Math.sin(angle) * 200,
        data: control
      })
      newEdges.push({ from: process.id, to: control.id })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const buildAllSystemsGraph = () => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Create a circular layout for all systems
    mockSystems.slice(0, 12).forEach((system, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.min(mockSystems.length, 12)
      newNodes.push({
        id: system.id,
        label: system.name,
        type: 'system',
        status: system.criticality === 'HIGH' ? 'warning' : 'ok',
        x: 400 + Math.cos(angle) * 200,
        y: 250 + Math.sin(angle) * 200,
        data: system
      })

      // Show a few controls for each system (max 2)
      const controls = mockControls.filter(c => c.systemIds.includes(system.id)).slice(0, 2)
      controls.forEach((control, cIdx) => {
        const nodeId = `${control.id}-${system.id}`
        const offsetAngle = angle + ((cIdx - 0.5) * 0.3)
        newNodes.push({
          id: nodeId,
          label: control.id,
          type: 'control',
          status: control.effectiveness === 'EFFECTIVE' ? 'ok' : control.effectiveness === 'INEFFECTIVE' ? 'critical' : 'warning',
          x: 400 + Math.cos(offsetAngle) * 300,
          y: 250 + Math.sin(offsetAngle) * 300,
          data: control
        })
        newEdges.push({ from: system.id, to: nodeId })
      })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const buildAllControlsGraph = () => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Create a circular layout for controls
    mockControls.slice(0, 15).forEach((control, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.min(mockControls.length, 15)
      newNodes.push({
        id: control.id,
        label: control.id,
        type: 'control',
        status: control.effectiveness === 'EFFECTIVE' ? 'ok' : control.effectiveness === 'INEFFECTIVE' ? 'critical' : 'warning',
        x: 400 + Math.cos(angle) * 220,
        y: 250 + Math.sin(angle) * 220,
        data: control
      })

      // Show connected systems
      control.systemIds.slice(0, 1).forEach(systemId => {
        const system = mockSystems.find(s => s.id === systemId)
        if (system) {
          const systemNodeId = `${system.id}-${control.id}`
          if (!newNodes.find(n => n.id === system.id || n.id === systemNodeId)) {
            const offsetAngle = angle + 0.15
            newNodes.push({
              id: systemNodeId,
              label: system.name.substring(0, 12),
              type: 'system',
              status: 'ok',
              x: 400 + Math.cos(offsetAngle) * 140,
              y: 250 + Math.sin(offsetAngle) * 140,
              data: system
            })
            newEdges.push({ from: control.id, to: systemNodeId })
          }
        }
      })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const buildAllRisksGraph = () => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Create a circular layout for risks
    mockRisks.slice(0, 10).forEach((risk, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.min(mockRisks.length, 10)
      newNodes.push({
        id: risk.id,
        label: risk.name.substring(0, 15),
        type: 'risk',
        status: risk.level === 'HIGH' ? 'warning' : 'ok',
        x: 400 + Math.cos(angle) * 200,
        y: 250 + Math.sin(angle) * 200,
        data: risk
      })

      // Show controls mitigating this risk
      const controls = mockControls.filter(c => c.riskIds.includes(risk.id)).slice(0, 2)
      controls.forEach((control, cIdx) => {
        const nodeId = `${control.id}-${risk.id}`
        const offsetAngle = angle + ((cIdx - 0.5) * 0.3)
        newNodes.push({
          id: nodeId,
          label: control.id,
          type: 'control',
          status: control.effectiveness === 'EFFECTIVE' ? 'ok' : control.effectiveness === 'INEFFECTIVE' ? 'critical' : 'warning',
          x: 400 + Math.cos(offsetAngle) * 100,
          y: 250 + Math.sin(offsetAngle) * 100,
          data: control
        })
        newEdges.push({ from: risk.id, to: nodeId })
      })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const buildAllFSItemsGraph = () => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Create a circular layout for FS items
    mockFSLineItems.slice(0, 12).forEach((fsItem, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.min(mockFSLineItems.length, 12)
      newNodes.push({
        id: fsItem.id,
        label: fsItem.name,
        type: 'fs',
        status: fsItem.materiality === 'HIGH' ? 'warning' : 'ok',
        x: 400 + Math.cos(angle) * 200,
        y: 250 + Math.sin(angle) * 200,
        data: fsItem
      })

      // Show controls for this FS item
      const controls = mockControls.filter(c => c.fsLineItemIds.includes(fsItem.id)).slice(0, 2)
      controls.forEach((control, cIdx) => {
        const nodeId = `${control.id}-${fsItem.id}`
        const offsetAngle = angle + ((cIdx - 0.5) * 0.3)
        newNodes.push({
          id: nodeId,
          label: control.id,
          type: 'control',
          status: control.effectiveness === 'EFFECTIVE' ? 'ok' : control.effectiveness === 'INEFFECTIVE' ? 'critical' : 'warning',
          x: 400 + Math.cos(offsetAngle) * 300,
          y: 250 + Math.sin(offsetAngle) * 300,
          data: control
        })
        newEdges.push({ from: fsItem.id, to: nodeId })
      })
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }

  const buildAllProcessesGraph = () => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Create a circular layout for processes
    mockProcesses.slice(0, 10).forEach((process, idx) => {
      const angle = (Math.PI * 2 * idx) / Math.min(mockProcesses.length, 10)
      newNodes.push({
        id: process.id,
        label: process.name.substring(0, 15),
        type: 'process',
        status: 'ok',
        x: 400 + Math.cos(angle) * 200,
        y: 250 + Math.sin(angle) * 200,
        data: process
      })

      // Show controls in this process
      const controls = mockControls.filter(c => c.processIds.includes(process.id)).slice(0, 2)
      controls.forEach((control, cIdx) => {
        const nodeId = `${control.id}-${process.id}`
        const offsetAngle = angle + ((cIdx - 0.5) * 0.3)
        newNodes.push({
          id: nodeId,
          label: control.id,
          type: 'control',
          status: control.effectiveness === 'EFFECTIVE' ? 'ok' : control.effectiveness === 'INEFFECTIVE' ? 'critical' : 'warning',
          x: 400 + Math.cos(offsetAngle) * 300,
          y: 250 + Math.sin(offsetAngle) * 300,
          data: control
        })
        newEdges.push({ from: process.id, to: nodeId })
      })
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

    // Switch to focused view for this node type
    setFocusEntityId(selectedNode.data.id)

    switch (selectedNode.type) {
      case 'system':
        setViewMode('system-focus')
        break
      case 'control':
        setViewMode('control-focus')
        break
      case 'risk':
        setViewMode('risk-focus')
        break
      case 'fs':
        setViewMode('fs-focus')
        break
      case 'process':
        setViewMode('process-focus')
        break
    }

    setShowDetailCard(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            Network Graph View
          </CardTitle>
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-controls">All Controls</SelectItem>
              <SelectItem value="all-systems">All Systems</SelectItem>
              <SelectItem value="all-risks">All Risks</SelectItem>
              <SelectItem value="all-fs-items">All FS Items</SelectItem>
              <SelectItem value="all-processes">All Processes</SelectItem>
              {focusEntityId && (
                <>
                  <SelectItem value="control-focus">Focus: Control</SelectItem>
                  <SelectItem value="system-focus">Focus: System</SelectItem>
                  <SelectItem value="risk-focus">Focus: Risk</SelectItem>
                  <SelectItem value="fs-focus">Focus: FS Item</SelectItem>
                  <SelectItem value="process-focus">Focus: Process</SelectItem>
                  <SelectItem value="issue-cascade">Issue Cascade</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {viewMode === 'issue-cascade' && '🔴 Issue Impact Cascade - Granular attribute-level analysis: Shows which SPECIFIC system capabilities failed and ONLY controls that depend on those same attributes'}
          {viewMode === 'control-focus' && '📊 Control Dependencies - What this control depends on and protects'}
          {viewMode === 'system-focus' && '⚙️ System Impact - All controls using this system'}
          {viewMode === 'risk-focus' && '⚠️ Risk Coverage - Controls mitigating this risk'}
          {viewMode === 'fs-focus' && '💰 FS Item Coverage - Controls protecting this line item'}
          {viewMode === 'process-focus' && '🔄 Process Controls - Controls within this process'}
          {viewMode === 'all-controls' && '📋 All Controls - Overview of control relationships'}
          {viewMode === 'all-systems' && '🖥️ All Systems - Systems and their controls'}
          {viewMode === 'all-risks' && '🎯 All Risks - Risks and mitigation controls'}
          {viewMode === 'all-fs-items' && '📊 All FS Items - Financial statements and controls'}
          {viewMode === 'all-processes' && '⚙️ All Processes - Processes and their controls'}
        </p>
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
                    {selectedNode.data.failedAttribute && (
                      <div className="mb-3 p-2 bg-orange-50 border border-orange-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-orange-700">⚠️ FAILED ATTRIBUTE</span>
                        </div>
                        <p className="text-sm font-semibold">{selectedNode.data.failedAttribute}</p>
                        {selectedNode.data.failedCapability && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Capability: {selectedNode.data.failedCapability}
                          </p>
                        )}
                      </div>
                    )}
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

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleViewConnections}
                  className="w-full mt-2"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View All Connections
                </Button>
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
