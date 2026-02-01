import { useState } from 'react'
import { mockControls } from '../data/mockControls'
import { Control } from '../types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Badge } from '../components/ui/badge'

export default function ControlsPage() {
  const [selectedControl, setSelectedControl] = useState<Control | null>(null)

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default'
      case 'UNDER_REVIEW':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Controls</h1>
        <p className="text-muted-foreground">
          Manage and review audit controls with multi-framework mapping
        </p>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Control ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Framework Coverage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Effectiveness</TableHead>
              <TableHead>Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockControls.map((control) => (
              <TableRow
                key={control.id}
                className="cursor-pointer"
                onClick={() => setSelectedControl(control)}
              >
                <TableCell className="font-medium">{control.id}</TableCell>
                <TableCell>{control.name}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {control.frameworkRequirements.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No mappings</span>
                    ) : (
                      control.frameworkRequirements.map((req, idx) => (
                        <Badge
                          key={idx}
                          className={getFrameworkBadgeColor(req.framework)}
                        >
                          {req.framework}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(control.status)}>
                    {control.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{control.effectiveness.replace('_', ' ')}</span>
                </TableCell>
                <TableCell>{control.owner}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        Showing {mockControls.length} controls
      </div>
    </div>
  )
}
