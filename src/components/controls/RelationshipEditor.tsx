import { useState } from 'react'
import { Control } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { X, Plus } from 'lucide-react'
import { mockSystems } from '../../data/mockSystems'
import { mockRisks } from '../../data/mockRisks'
import { mockProcesses } from '../../data/mockProcesses'
import { mockFSLineItems } from '../../data/mockFSLineItems'

interface RelationshipEditorProps {
  control: Control
  onUpdate: (control: Control) => void
}

export default function RelationshipEditor({ control, onUpdate }: RelationshipEditorProps) {
  const [systemSearch, setSystemSearch] = useState('')
  const [riskSearch, setRiskSearch] = useState('')
  const [processSearch, setProcessSearch] = useState('')
  const [fsSearch, setFsSearch] = useState('')

  // Get current relationships
  const linkedSystems = mockSystems.filter((s) => control.systemIds.includes(s.id))
  const linkedRisks = mockRisks.filter((r) => control.riskIds.includes(r.id))
  const linkedProcesses = mockProcesses.filter((p) => control.processIds.includes(p.id))
  const linkedFSItems = mockFSLineItems.filter((fs) => control.fsLineItemIds.includes(fs.id))

  // Get available (not yet linked) items
  const availableSystems = mockSystems.filter(
    (s) => !control.systemIds.includes(s.id) && s.name.toLowerCase().includes(systemSearch.toLowerCase())
  )
  const availableRisks = mockRisks.filter(
    (r) => !control.riskIds.includes(r.id) && r.name.toLowerCase().includes(riskSearch.toLowerCase())
  )
  const availableProcesses = mockProcesses.filter(
    (p) => !control.processIds.includes(p.id) && p.name.toLowerCase().includes(processSearch.toLowerCase())
  )
  const availableFSItems = mockFSLineItems.filter(
    (fs) => !control.fsLineItemIds.includes(fs.id) && fs.name.toLowerCase().includes(fsSearch.toLowerCase())
  )

  const handleAddSystem = (systemId: string) => {
    const updated = { ...control, systemIds: [...control.systemIds, systemId] }
    onUpdate(updated)
    setSystemSearch('')
  }

  const handleRemoveSystem = (systemId: string) => {
    const updated = { ...control, systemIds: control.systemIds.filter((id) => id !== systemId) }
    onUpdate(updated)
  }

  const handleAddRisk = (riskId: string) => {
    const updated = { ...control, riskIds: [...control.riskIds, riskId] }
    onUpdate(updated)
    setRiskSearch('')
  }

  const handleRemoveRisk = (riskId: string) => {
    const updated = { ...control, riskIds: control.riskIds.filter((id) => id !== riskId) }
    onUpdate(updated)
  }

  const handleAddProcess = (processId: string) => {
    const updated = { ...control, processIds: [...control.processIds, processId] }
    onUpdate(updated)
    setProcessSearch('')
  }

  const handleRemoveProcess = (processId: string) => {
    const updated = { ...control, processIds: control.processIds.filter((id) => id !== processId) }
    onUpdate(updated)
  }

  const handleAddFS = (fsId: string) => {
    const updated = { ...control, fsLineItemIds: [...control.fsLineItemIds, fsId] }
    onUpdate(updated)
    setFsSearch('')
  }

  const handleRemoveFS = (fsId: string) => {
    const updated = { ...control, fsLineItemIds: control.fsLineItemIds.filter((id) => id !== fsId) }
    onUpdate(updated)
  }

  return (
    <div className="space-y-6">
      {/* Systems */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Systems ({linkedSystems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Linked systems */}
            <div className="flex flex-wrap gap-2">
              {linkedSystems.map((system) => (
                <Badge key={system.id} variant="outline" className="gap-2">
                  {system.name}
                  <button
                    onClick={() => handleRemoveSystem(system.id)}
                    className="hover:bg-muted p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {linkedSystems.length === 0 && (
                <p className="text-xs text-muted-foreground">No systems linked</p>
              )}
            </div>

            {/* Add new system */}
            <div className="border-t pt-3">
              <Input
                placeholder="Search systems to add..."
                value={systemSearch}
                onChange={(e) => setSystemSearch(e.target.value)}
                className="mb-2"
              />
              {systemSearch && availableSystems.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableSystems.slice(0, 5).map((system) => (
                    <div
                      key={system.id}
                      onClick={() => handleAddSystem(system.id)}
                      className="text-sm p-2 hover:bg-muted cursor-pointer border border-border"
                    >
                      <div className="font-medium">{system.name}</div>
                      <div className="text-xs text-muted-foreground">{system.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Risks ({linkedRisks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Linked risks */}
            <div className="flex flex-wrap gap-2">
              {linkedRisks.map((risk) => (
                <Badge key={risk.id} variant="outline" className="gap-2">
                  <Badge variant="outline" className="text-xs px-1">
                    {risk.level}
                  </Badge>
                  {risk.name}
                  <button
                    onClick={() => handleRemoveRisk(risk.id)}
                    className="hover:bg-muted p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {linkedRisks.length === 0 && (
                <p className="text-xs text-muted-foreground">No risks linked</p>
              )}
            </div>

            {/* Add new risk */}
            <div className="border-t pt-3">
              <Input
                placeholder="Search risks to add..."
                value={riskSearch}
                onChange={(e) => setRiskSearch(e.target.value)}
                className="mb-2"
              />
              {riskSearch && availableRisks.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableRisks.slice(0, 5).map((risk) => (
                    <div
                      key={risk.id}
                      onClick={() => handleAddRisk(risk.id)}
                      className="text-sm p-2 hover:bg-muted cursor-pointer border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {risk.level}
                        </Badge>
                        <span className="font-medium">{risk.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{risk.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Processes ({linkedProcesses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Linked processes */}
            <div className="flex flex-wrap gap-2">
              {linkedProcesses.map((process) => (
                <Badge key={process.id} variant="outline" className="gap-2">
                  {process.name}
                  <button
                    onClick={() => handleRemoveProcess(process.id)}
                    className="hover:bg-muted p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {linkedProcesses.length === 0 && (
                <p className="text-xs text-muted-foreground">No processes linked</p>
              )}
            </div>

            {/* Add new process */}
            <div className="border-t pt-3">
              <Input
                placeholder="Search processes to add..."
                value={processSearch}
                onChange={(e) => setProcessSearch(e.target.value)}
                className="mb-2"
              />
              {processSearch && availableProcesses.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableProcesses.slice(0, 5).map((process) => (
                    <div
                      key={process.id}
                      onClick={() => handleAddProcess(process.id)}
                      className="text-sm p-2 hover:bg-muted cursor-pointer border border-border"
                    >
                      <div className="font-medium">{process.name}</div>
                      <div className="text-xs text-muted-foreground">{process.category}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FS Line Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">FS Line Items ({linkedFSItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Linked FS items */}
            <div className="flex flex-wrap gap-2">
              {linkedFSItems.map((fs) => (
                <Badge key={fs.id} variant="outline" className="gap-2">
                  {fs.name}
                  <button
                    onClick={() => handleRemoveFS(fs.id)}
                    className="hover:bg-muted p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {linkedFSItems.length === 0 && (
                <p className="text-xs text-muted-foreground">No FS line items linked</p>
              )}
            </div>

            {/* Add new FS item */}
            <div className="border-t pt-3">
              <Input
                placeholder="Search FS line items to add..."
                value={fsSearch}
                onChange={(e) => setFsSearch(e.target.value)}
                className="mb-2"
              />
              {fsSearch && availableFSItems.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableFSItems.slice(0, 5).map((fs) => (
                    <div
                      key={fs.id}
                      onClick={() => handleAddFS(fs.id)}
                      className="text-sm p-2 hover:bg-muted cursor-pointer border border-border"
                    >
                      <div className="font-medium">{fs.name}</div>
                      <div className="text-xs text-muted-foreground">
                        ${(fs.amount / 1000000).toFixed(0)}M - {fs.materiality} materiality
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
