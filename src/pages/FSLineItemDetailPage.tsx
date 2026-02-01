import { useParams, useNavigate } from 'react-router-dom'
import { mockFSLineItems } from '../data/mockFSLineItems'
import { mockControls } from '../data/mockControls'
import { mockProcesses } from '../data/mockProcesses'
import { mockSystems } from '../data/mockSystems'
import { mockRisks } from '../data/mockRisks'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { ArrowLeft } from 'lucide-react'

export default function FSLineItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const fsLineItem = mockFSLineItems.find((fs) => fs.id === id)

  if (!fsLineItem) {
    return (
      <div className="p-8">
        <p>FS Line Item not found</p>
      </div>
    )
  }

  // Get related entities
  const relatedControls = mockControls.filter((c) =>
    c.fsLineItemIds.includes(fsLineItem.id)
  )

  const relatedProcesses = mockProcesses.filter((p) =>
    relatedControls.some((c) => c.processIds.includes(p.id))
  )

  const relatedSystems = mockSystems.filter((s) =>
    relatedControls.some((c) => c.systemIds.includes(s.id))
  )

  const relatedRisks = mockRisks.filter((r) =>
    relatedControls.some((c) => c.riskIds.includes(r.id))
  )

  // Calculate coverage by process
  const processCoverage = relatedProcesses.map((process) => {
    const processControls = relatedControls.filter((c) =>
      c.processIds.includes(process.id)
    )
    const totalPossible = 10
    const coveragePercentage = Math.min(
      100,
      Math.round((processControls.length / totalPossible) * 100)
    )

    return {
      process,
      controlCount: processControls.length,
      coveragePercentage,
    }
  })

  return (
    <div className="p-8">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/fs-line-items')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to FS Line Items
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{fsLineItem.name}</h1>
            <div className="flex gap-2">
              <Badge
                variant={
                  fsLineItem.materiality === 'HIGH' ? 'default' : 'outline'
                }
              >
                {fsLineItem.materiality} Materiality
              </Badge>
              <Badge variant="outline">{fsLineItem.category}</Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Amount</div>
            <div className="text-3xl font-bold">
              ${(fsLineItem.amount / 1000000).toFixed(0)}M
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {fsLineItem.reportingPeriod}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              Total Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{relatedControls.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              Processes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{relatedProcesses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              Systems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{relatedSystems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{relatedRisks.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Visualization */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Coverage by Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {processCoverage.map((item) => (
              <div key={item.process.id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{item.process.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.controlCount} controls
                    </p>
                  </div>
                  <span className="text-sm font-medium">{item.coveragePercentage}%</span>
                </div>
                <div className="w-full bg-muted h-2">
                  <div
                    className="bg-primary h-2"
                    style={{ width: `${item.coveragePercentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="controls">
        <TabsList>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="processes">Processes</TabsTrigger>
          <TabsTrigger value="systems">Systems</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
        </TabsList>

        <TabsContent value="controls">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Control ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedControls.map((control) => (
                    <TableRow key={control.id}>
                      <TableCell className="font-medium">{control.id}</TableCell>
                      <TableCell>{control.name}</TableCell>
                      <TableCell className="text-sm">
                        {control.type.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{control.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{control.owner}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processes">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Process Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Controls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedProcesses.map((process) => {
                    const processControlCount = relatedControls.filter((c) =>
                      c.processIds.includes(process.id)
                    ).length
                    return (
                      <TableRow key={process.id}>
                        <TableCell className="font-medium">{process.name}</TableCell>
                        <TableCell className="text-sm">{process.category}</TableCell>
                        <TableCell className="text-sm">{process.owner}</TableCell>
                        <TableCell>{processControlCount}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="systems">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>System Name</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Vendor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedSystems.map((system) => (
                    <TableRow key={system.id}>
                      <TableCell className="font-medium">{system.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{system.criticality}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{system.owner}</TableCell>
                      <TableCell className="text-sm">{system.vendor || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Owner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedRisks.map((risk) => (
                    <TableRow key={risk.id}>
                      <TableCell className="font-medium">{risk.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={risk.level === 'HIGH' ? 'default' : 'outline'}
                        >
                          {risk.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{risk.category}</TableCell>
                      <TableCell className="text-sm">{risk.owner}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
