import { Issue } from '../../types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { mockControls } from '../../data/mockControls'
import { mockRisks } from '../../data/mockRisks'
import { mockSystems } from '../../data/mockSystems'
import { mockFSLineItems } from '../../data/mockFSLineItems'
import { AlertCircle } from 'lucide-react'

interface ImpactAnalysisPanelProps {
  issue: Issue | null
  open: boolean
  onClose: () => void
}

export default function ImpactAnalysisPanel({
  issue,
  open,
  onClose,
}: ImpactAnalysisPanelProps) {
  if (!issue) return null

  // Get affected control
  const affectedControl = mockControls.find((c) => c.id === issue.controlId)
  if (!affectedControl) return null

  // Direct impact
  const exposedRisks = mockRisks.filter((r) =>
    affectedControl.riskIds.includes(r.id)
  )
  const affectedSystems = mockSystems.filter((s) =>
    affectedControl.systemIds.includes(s.id)
  )

  // Cascade impact - controls on the same systems
  const relatedControls = mockControls.filter(
    (c) =>
      c.id !== affectedControl.id &&
      c.systemIds.some((sId) => affectedControl.systemIds.includes(sId))
  )

  const impactedFrameworks = Array.from(
    new Set(affectedControl.frameworkRequirements.map((r) => r.framework))
  )

  const fsLineItemsAtRisk = mockFSLineItems.filter((fs) =>
    affectedControl.fsLineItemIds.includes(fs.id)
  )

  // Suggested actions
  const suggestedActions = [
    `Immediately remediate the issue: ${issue.title}`,
    `Review and test ${relatedControls.length} related controls on affected systems`,
    `Assess compensating controls to mitigate exposed risks`,
    `Notify stakeholders of potential impact to ${impactedFrameworks.join(', ')} compliance`,
    fsLineItemsAtRisk.length > 0
      ? `Evaluate impact on financial statement line items: ${fsLineItemsAtRisk.map((fs) => fs.name).join(', ')}`
      : null,
    'Document findings and remediation plan for audit evidence',
  ].filter(Boolean) as string[]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-gray-900 text-white'
      case 'HIGH':
        return 'bg-gray-700 text-white'
      case 'MEDIUM':
        return 'bg-gray-500 text-white'
      default:
        return 'bg-gray-400 text-white'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl" onClose={onClose}>
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-destructive shrink-0 mt-1" />
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">Impact Analysis</DialogTitle>
              <p className="text-sm font-medium">{issue.title}</p>
              <div className="flex gap-2 mt-2">
                <Badge className={getSeverityColor(issue.severity)}>
                  {issue.severity}
                </Badge>
                <Badge variant="outline">{issue.status}</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Direct Impact */}
          <Card className="border-red-300 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-red-900">
                1. Direct Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-red-900 mb-1">
                  Control → INEFFECTIVE
                </p>
                <p className="text-sm text-red-800">
                  {affectedControl.id} - {affectedControl.name}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-red-900 mb-2">
                  Risks Exposed ({exposedRisks.length}):
                </p>
                <div className="space-y-1">
                  {exposedRisks.map((risk) => (
                    <div key={risk.id} className="flex items-center gap-2 text-sm text-red-800">
                      <Badge variant="outline" className="text-xs">
                        {risk.level}
                      </Badge>
                      <span>{risk.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-red-900 mb-2">
                  Systems Affected ({affectedSystems.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {affectedSystems.map((system) => (
                    <Badge key={system.id} variant="outline">
                      {system.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cascade Impact */}
          <Card className="border-yellow-300 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-yellow-900">
                2. Cascade Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-yellow-900 mb-1">
                  Related Controls on Same Systems:
                </p>
                <p className="text-2xl font-bold text-yellow-900">
                  {relatedControls.length} controls
                </p>
                <p className="text-xs text-yellow-800 mt-1">
                  Should be reviewed for potential impact
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-yellow-900 mb-2">
                  Frameworks Impacted:
                </p>
                <div className="flex gap-2">
                  {impactedFrameworks.map((framework) => (
                    <Badge
                      key={framework}
                      className={
                        framework === 'SOX'
                          ? 'bg-gray-900 text-white'
                          : framework === 'SOC2'
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-500 text-white'
                      }
                    >
                      {framework}
                    </Badge>
                  ))}
                </div>
              </div>

              {fsLineItemsAtRisk.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-yellow-900 mb-2">
                    FS Line Items at Risk:
                  </p>
                  <div className="space-y-1">
                    {fsLineItemsAtRisk.map((fs) => (
                      <div key={fs.id} className="text-sm text-yellow-800">
                        • {fs.name} (${(fs.amount / 1000000).toFixed(0)}M)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggested Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">3. Suggested Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {suggestedActions.map((action, idx) => (
                  <li key={idx} className="text-sm flex gap-2">
                    <span className="font-medium shrink-0">{idx + 1}.</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Issue Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Description: </span>
                <span className="text-muted-foreground">{issue.description}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Identified: </span>
                  <span className="text-muted-foreground">
                    {new Date(issue.identifiedDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Identified By: </span>
                  <span className="text-muted-foreground">{issue.identifiedBy}</span>
                </div>
                {issue.dueDate && (
                  <div>
                    <span className="font-medium">Due Date: </span>
                    <span className="text-muted-foreground">
                      {new Date(issue.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {issue.assignedTo && (
                  <div>
                    <span className="font-medium">Assigned To: </span>
                    <span className="text-muted-foreground">{issue.assignedTo}</span>
                  </div>
                )}
              </div>
              {issue.resolution && (
                <div>
                  <span className="font-medium">Resolution: </span>
                  <span className="text-muted-foreground">{issue.resolution}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
