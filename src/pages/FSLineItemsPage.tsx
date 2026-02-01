import { useNavigate } from 'react-router-dom'
import { mockFSLineItems } from '../data/mockFSLineItems'
import { mockControls } from '../data/mockControls'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Badge } from '../components/ui/badge'

export default function FSLineItemsPage() {
  const navigate = useNavigate()

  const fsLineItemsWithCoverage = mockFSLineItems.map((fs) => {
    const relatedControls = mockControls.filter((c) =>
      c.fsLineItemIds.includes(fs.id)
    )

    const totalPossibleControls = 25
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
        <h1 className="text-3xl font-bold mb-2">Financial Statement Line Items</h1>
        <p className="text-muted-foreground">
          View control coverage for financial statement line items
        </p>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Line Item</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Materiality</TableHead>
              <TableHead>Controls</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fsLineItemsWithCoverage.map((item) => (
              <TableRow
                key={item.fsLineItem.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/fs-line-items/${item.fsLineItem.id}`)}
              >
                <TableCell className="font-medium">{item.fsLineItem.name}</TableCell>
                <TableCell>
                  ${(item.fsLineItem.amount / 1000000).toFixed(0)}M
                </TableCell>
                <TableCell className="text-sm">{item.fsLineItem.category}</TableCell>
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
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        Showing {mockFSLineItems.length} financial statement line items
      </div>
    </div>
  )
}
