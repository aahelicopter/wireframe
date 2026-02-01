import { useState } from 'react'
import { Control, Framework } from '../../types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { mockFrameworkRequirements } from '../../data/mockFrameworkRequirements'

interface FrameworkMappingModalProps {
  control: Control | null
  open: boolean
  onClose: () => void
  onSave: (requirementIds: string[]) => void
}

export default function FrameworkMappingModal({
  control,
  open,
  onClose,
  onSave,
}: FrameworkMappingModalProps) {
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>(
    control?.frameworkRequirements.map((req) => req.requirementId) || []
  )
  const [showSuccess, setShowSuccess] = useState(false)

  if (!control) return null

  const getFrameworkBadgeColor = (framework: Framework) => {
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

  const handleToggle = (requirementId: string) => {
    setSelectedRequirements((prev) =>
      prev.includes(requirementId)
        ? prev.filter((id) => id !== requirementId)
        : [...prev, requirementId]
    )
  }

  const handleSave = () => {
    onSave(selectedRequirements)
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      onClose()
    }, 1500)
  }

  const groupedRequirements = mockFrameworkRequirements.reduce((acc, req) => {
    if (!acc[req.framework]) {
      acc[req.framework] = []
    }
    acc[req.framework].push(req)
    return acc
  }, {} as Record<Framework, typeof mockFrameworkRequirements>)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl" onClose={onClose}>
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="text-2xl">
            Map Frameworks to {control.id}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Select framework requirements that this control satisfies
          </p>
        </DialogHeader>

        {showSuccess ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h3 className="text-xl font-semibold mb-2">Mappings Updated Successfully!</h3>
            <p className="text-muted-foreground">
              Framework requirements have been updated for {control.id}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto">
              {(Object.keys(groupedRequirements) as Framework[]).map((framework) => (
                <div key={framework}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={getFrameworkBadgeColor(framework)}>
                      {framework}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({groupedRequirements[framework].length} requirements)
                    </span>
                  </div>

                  <div className="space-y-2 ml-2">
                    {groupedRequirements[framework].map((req) => {
                      const isSelected = selectedRequirements.includes(req.id)
                      return (
                        <div
                          key={req.id}
                          className={`border border-border p-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleToggle(req.id)}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggle(req.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-sm">
                                    {req.requirementId} - {req.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {req.description}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {req.category}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                {selectedRequirements.length} requirement(s) selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Mappings
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
