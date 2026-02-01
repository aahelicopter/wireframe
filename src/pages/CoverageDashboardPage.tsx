import { mockControls } from '../data/mockControls'
import { mockFrameworkRequirements } from '../data/mockFrameworkRequirements'
import { mockFSLineItems } from '../data/mockFSLineItems'
import { mockTests } from '../data/mockTests'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Framework } from '../types'

export default function CoverageDashboardPage() {
  // Calculate framework coverage
  const calculateFrameworkCoverage = (framework: Framework) => {
    const totalRequirements = mockFrameworkRequirements.filter(
      (r) => r.framework === framework
    ).length

    const mappedRequirements = new Set(
      mockControls.flatMap((c) =>
        c.frameworkRequirements
          .filter((req) => req.framework === framework)
          .map((req) => req.requirementId)
      )
    ).size

    return {
      total: totalRequirements,
      mapped: mappedRequirements,
      percentage: Math.round((mappedRequirements / totalRequirements) * 100),
    }
  }

  const soxCoverage = calculateFrameworkCoverage('SOX')
  const soc2Coverage = calculateFrameworkCoverage('SOC2')
  const isoCoverage = calculateFrameworkCoverage('ISO27001')

  // Calculate efficiency metrics
  const totalTests = mockTests.length
  const totalRequirementsSatisfied = mockControls.reduce((sum, control) => {
    return sum + control.frameworkRequirements.length
  }, 0)
  const reusabilityRatio = totalRequirementsSatisfied / totalTests || 0
  const estimatedHoursSaved = Math.round(totalRequirementsSatisfied * 4.5) // Assume 4.5 hours per requirement
  const estimatedCostSavings = estimatedHoursSaved * 150 // Assume $150/hour

  // Calculate FS Line Item Coverage
  const fsLineItemCoverage = mockFSLineItems.map((fs) => {
    const relatedControls = mockControls.filter((c) =>
      c.fsLineItemIds.includes(fs.id)
    )

    const totalPossibleControls = 25 // Assume 25 is ideal coverage
    const coveragePercentage = Math.min(
      100,
      Math.round((relatedControls.length / totalPossibleControls) * 100)
    )

    return {
      fsLineItem: fs,
      controlCount: relatedControls.length,
      coveragePercentage,
    }
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Coverage Dashboard</h1>
        <p className="text-muted-foreground">
          Framework coverage metrics and efficiency analysis
        </p>
      </div>

      {/* Framework Coverage Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">SOX Coverage</CardTitle>
              <Badge className="bg-gray-900 text-white">SOX</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{soxCoverage.percentage}%</div>
            <div className="w-full bg-muted h-2 mb-3">
              <div
                className="bg-gray-900 h-2"
                style={{ width: `${soxCoverage.percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {soxCoverage.mapped} of {soxCoverage.total} requirements covered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">SOC 2 Coverage</CardTitle>
              <Badge className="bg-gray-700 text-white">SOC2</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{soc2Coverage.percentage}%</div>
            <div className="w-full bg-muted h-2 mb-3">
              <div
                className="bg-gray-700 h-2"
                style={{ width: `${soc2Coverage.percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {soc2Coverage.mapped} of {soc2Coverage.total} requirements covered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">ISO 27001 Coverage</CardTitle>
              <Badge className="bg-gray-500 text-white">ISO27001</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{isoCoverage.percentage}%</div>
            <div className="w-full bg-muted h-2 mb-3">
              <div
                className="bg-gray-500 h-2"
                style={{ width: `${isoCoverage.percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isoCoverage.mapped} of {isoCoverage.total} requirements covered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Metrics Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Testing Efficiency Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Reusability Ratio</p>
              <p className="text-2xl font-bold">{reusabilityRatio.toFixed(1)}x</p>
              <p className="text-xs text-muted-foreground mt-1">
                Controls per test
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tests Performed</p>
              <p className="text-2xl font-bold">{totalTests}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Total test procedures
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Requirements Satisfied</p>
              <p className="text-2xl font-bold">{totalRequirementsSatisfied}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Across all frameworks
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Hours Saved</p>
              <p className="text-2xl font-bold">~{estimatedHoursSaved}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Estimated time savings
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Cost Savings</p>
              <p className="text-2xl font-bold">${(estimatedCostSavings / 1000).toFixed(0)}K</p>
              <p className="text-xs text-muted-foreground mt-1">
                Estimated cost reduction
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FS Line Item Coverage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Statement Line Item Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>FS Line Item</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Materiality</TableHead>
                <TableHead>Controls</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fsLineItemCoverage.map((item) => (
                <TableRow key={item.fsLineItem.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{item.fsLineItem.name}</TableCell>
                  <TableCell>
                    ${(item.fsLineItem.amount / 1000000).toFixed(0)}M
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.fsLineItem.materiality === 'HIGH'
                          ? 'default'
                          : 'outline'
                      }
                    >
                      {item.fsLineItem.materiality}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.controlCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="w-full bg-muted h-2">
                          <div
                            className="bg-primary h-2"
                            style={{ width: `${item.coveragePercentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium w-12">
                        {item.coveragePercentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground hover:underline">
                      View Details →
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
