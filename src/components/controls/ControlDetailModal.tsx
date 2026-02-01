import { Control } from '../../types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { mockSystems } from '../../data/mockSystems'
import { mockRisks } from '../../data/mockRisks'
import { mockProcesses } from '../../data/mockProcesses'
import { mockFSLineItems } from '../../data/mockFSLineItems'
import RelationshipEditor from './RelationshipEditor'

interface ControlDetailModalProps {
  control: Control | null
  open: boolean
  onClose: () => void
  onMapFrameworks?: () => void
  onUpdateControl?: (control: Control) => void
}

export default function ControlDetailModal({
  control,
  open,
  onClose,
  onMapFrameworks,
  onUpdateControl,
}: ControlDetailModalProps) {
  if (!control) return null

  const getFrameworkBadgeColor = (framework: string) => {
    switch (framework) {
      case 'SOX':
        return 'bg-gray-900 text-white'
      case 'SOC2':
        return 'bg-gray-700 text-white'
      case 'ISO27001':
        return 'bg-gray-500 text-white'
      default:
        return 'bg-gray-400 text-white'
    }
  }

  const systems = mockSystems.filter((s) => control.systemIds.includes(s.id))
  const risks = mockRisks.filter((r) => control.riskIds.includes(r.id))
  const processes = mockProcesses.filter((p) => control.processIds.includes(p.id))
  const fsLineItems = mockFSLineItems.filter((fs) => control.fsLineItemIds.includes(fs.id))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl" onClose={onClose}>
        {/* Header */}
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{control.id} - {control.name}</DialogTitle>
              <div className="flex gap-2 mt-2">
                <Badge variant="default">{control.status.replace('_', ' ')}</Badge>
                <Badge variant="outline">{control.effectiveness.replace('_', ' ')}</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Section 1: Description and Objective */}
          <div>
            <h3 className="font-semibold text-lg mb-2">Description</h3>
            <p className="text-sm text-muted-foreground mb-3">{control.description}</p>
            <h3 className="font-semibold text-lg mb-2">Objective</h3>
            <p className="text-sm text-muted-foreground">{control.objective}</p>
          </div>

          {/* Section 2: Classification */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Classification</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Type:</span>
                <p className="text-sm text-muted-foreground">{control.type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Automation Level:</span>
                <p className="text-sm text-muted-foreground">{control.automationLevel.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Frequency:</span>
                <p className="text-sm text-muted-foreground">{control.frequency}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Owner:</span>
                <p className="text-sm text-muted-foreground">{control.owner}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Framework Coverage */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Framework Coverage</h3>
              <Button variant="outline" size="sm" onClick={onMapFrameworks}>
                Map to Additional Frameworks
              </Button>
            </div>

            {control.frameworkRequirements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No framework mappings</p>
            ) : (
              <div className="space-y-3">
                {control.frameworkRequirements.map((req, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Badge className={getFrameworkBadgeColor(req.framework)}>
                          {req.framework}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {req.requirementId} - {req.requirementTitle}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Mapped: {new Date(req.mappedDate).toLocaleDateString()}</span>
                            <span>By: {req.mappedBy}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Relationships */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Relationships</h3>
            <Tabs defaultValue="view">
              <TabsList>
                <TabsTrigger value="view">View</TabsTrigger>
                <TabsTrigger value="edit">Edit Relationships</TabsTrigger>
              </TabsList>

              <TabsContent value="view" className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Systems */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Systems ({systems.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {systems.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No systems</p>
                      ) : (
                        <ul className="space-y-1">
                          {systems.map((system) => (
                            <li key={system.id} className="text-xs">
                              • {system.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  {/* Risks */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Risks ({risks.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {risks.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No risks</p>
                      ) : (
                        <ul className="space-y-1">
                          {risks.map((risk) => (
                            <li key={risk.id} className="text-xs flex items-center gap-2">
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {risk.level}
                              </Badge>
                              {risk.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  {/* Processes */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Processes ({processes.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {processes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No processes</p>
                      ) : (
                        <ul className="space-y-1">
                          {processes.map((process) => (
                            <li key={process.id} className="text-xs">
                              • {process.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  {/* FS Line Items */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">FS Line Items ({fsLineItems.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {fsLineItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No FS line items</p>
                      ) : (
                        <ul className="space-y-1">
                          {fsLineItems.map((fs) => (
                            <li key={fs.id} className="text-xs">
                              • {fs.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="edit" className="mt-4">
                {onUpdateControl && (
                  <RelationshipEditor
                    control={control}
                    onUpdate={onUpdateControl}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
