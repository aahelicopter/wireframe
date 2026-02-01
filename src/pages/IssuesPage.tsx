import { useState } from 'react'
import { mockIssues } from '../data/mockIssues'
import { Issue } from '../types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Badge } from '../components/ui/badge'
import ImpactAnalysisPanel from '../components/issues/ImpactAnalysisPanel'

export default function IssuesPage() {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)

  const getSeverityBadgeColor = (severity: string) => {
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'default'
      case 'IN_PROGRESS':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Issues</h1>
        <p className="text-muted-foreground">
          Track and analyze control deficiencies and their impact
        </p>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issue ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Control</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Identified</TableHead>
              <TableHead>Assigned To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockIssues.map((issue) => (
              <TableRow
                key={issue.id}
                className="cursor-pointer"
                onClick={() => setSelectedIssue(issue)}
              >
                <TableCell className="font-medium">{issue.id}</TableCell>
                <TableCell>{issue.title}</TableCell>
                <TableCell>
                  <Badge className={getSeverityBadgeColor(issue.severity)}>
                    {issue.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{issue.controlId}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(issue.status)}>
                    {issue.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(issue.identifiedDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm">
                  {issue.assignedTo || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {mockIssues.length} issues</span>
        <div className="flex gap-4">
          <span>
            Critical: {mockIssues.filter((i) => i.severity === 'CRITICAL').length}
          </span>
          <span>
            High: {mockIssues.filter((i) => i.severity === 'HIGH').length}
          </span>
          <span>
            Medium: {mockIssues.filter((i) => i.severity === 'MEDIUM').length}
          </span>
          <span>
            Open: {mockIssues.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length}
          </span>
        </div>
      </div>

      <ImpactAnalysisPanel
        issue={selectedIssue}
        open={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />
    </div>
  )
}
