import { Control } from '../../types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Check } from 'lucide-react'

interface TestCompleteModalProps {
  control: Control | null
  testName: string
  open: boolean
  onClose: () => void
}

export default function TestCompleteModal({
  control,
  testName,
  open,
  onClose,
}: TestCompleteModalProps) {
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

  const totalRequirements = control.frameworkRequirements.length
  const estimatedHoursSaved = Math.round(totalRequirements * 4.5)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" onClose={onClose}>
        {/* Success Header */}
        <div className="text-center py-6 border-b border-border">
          <div className="w-16 h-16 bg-primary mx-auto mb-4 flex items-center justify-center">
            <Check className="w-10 h-10 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl mb-2">Test Completed Successfully!</DialogTitle>
          <p className="text-sm text-muted-foreground">{testName}</p>
        </div>

        {/* Framework Requirements */}
        <div className="py-4">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <span>📊</span> This test satisfied requirements for:
          </h3>

          {control.frameworkRequirements.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No framework mappings for this control
            </p>
          ) : (
            <div className="space-y-2">
              {control.frameworkRequirements.map((req, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 border border-border bg-muted/30"
                >
                  <Check className="w-5 h-5 text-primary" />
                  <Badge className={getFrameworkBadgeColor(req.framework)}>
                    {req.framework}
                  </Badge>
                  <span className="text-sm flex-1">
                    {req.requirementId} - {req.requirementTitle}
                  </span>
                  <Check className="w-5 h-5 text-primary" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="py-4 border-t border-border">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <span>📈</span> Multi-Framework Efficiency:
          </h3>

          <div className="bg-muted p-4 text-center">
            <div className="text-3xl font-bold mb-2">
              1 Test = {totalRequirements} Requirement{totalRequirements !== 1 ? 's' : ''} = ~{estimatedHoursSaved} Hours Saved
            </div>
            <p className="text-sm text-muted-foreground">
              By mapping one control to multiple frameworks, this single test procedure
              satisfies {totalRequirements} compliance requirement{totalRequirements !== 1 ? 's' : ''} simultaneously
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center pt-4 border-t border-border">
          <Button onClick={onClose}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
