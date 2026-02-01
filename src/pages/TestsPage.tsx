import { useState } from 'react'
import { mockTests } from '../data/mockTests'
import { mockControls } from '../data/mockControls'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import TestCompleteModal from '../components/tests/TestCompleteModal'

export default function TestsPage() {
  const [tests, setTests] = useState(mockTests)
  const [completedTest, setCompletedTest] = useState<{
    testName: string
    controlId: string
  } | null>(null)

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETE_PASS':
        return 'default'
      case 'COMPLETE_FAIL':
        return 'destructive'
      case 'IN_PROGRESS':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const handleCompleteTest = (testId: string) => {
    const test = tests.find((t) => t.id === testId)
    if (!test) return

    // Mark test as complete
    setTests((prev) =>
      prev.map((t) =>
        t.id === testId
          ? {
              ...t,
              status: 'COMPLETE_PASS' as const,
              testDate: new Date().toISOString().split('T')[0],
              testedBy: 'Current User',
              result: 'Test completed successfully',
            }
          : t
      )
    )

    // Show completion modal
    setCompletedTest({
      testName: test.name,
      controlId: test.controlId,
    })
  }

  const getControl = (controlId: string) => {
    return mockControls.find((c) => c.id === controlId) || null
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test Procedures</h1>
        <p className="text-muted-foreground">
          Manage and execute control testing procedures
        </p>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Control</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Test Date</TableHead>
              <TableHead>Tested By</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests.map((test) => (
              <TableRow key={test.id}>
                <TableCell className="font-medium">{test.id}</TableCell>
                <TableCell>{test.name}</TableCell>
                <TableCell>
                  <span className="text-sm">{test.controlId}</span>
                </TableCell>
                <TableCell className="text-sm">{test.periodCovered}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(test.status)}>
                    {test.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {test.testDate || '-'}
                </TableCell>
                <TableCell className="text-sm">
                  {test.testedBy || '-'}
                </TableCell>
                <TableCell>
                  {test.status === 'IN_PROGRESS' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompleteTest(test.id)}
                    >
                      Mark Complete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {tests.length} test procedures</span>
        <div className="flex gap-4">
          <span>
            Passed: {tests.filter((t) => t.status === 'COMPLETE_PASS').length}
          </span>
          <span>
            Failed: {tests.filter((t) => t.status === 'COMPLETE_FAIL').length}
          </span>
          <span>
            In Progress: {tests.filter((t) => t.status === 'IN_PROGRESS').length}
          </span>
        </div>
      </div>

      {completedTest && (
        <TestCompleteModal
          control={getControl(completedTest.controlId)}
          testName={completedTest.testName}
          open={!!completedTest}
          onClose={() => setCompletedTest(null)}
        />
      )}
    </div>
  )
}
