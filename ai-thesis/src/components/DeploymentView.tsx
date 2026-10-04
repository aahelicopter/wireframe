import { useMemo, useState } from 'react'
import type { Store } from '../lib/store'
import { branchColors, usd, usdK } from '../lib/format'

export function DeploymentView({ store }: { store: Store }) {
  const { state, plan } = store
  const colors = useMemo(() => branchColors(state.nodes), [state.nodes])
  const branchOf = new Map(plan.recommendations.map((r) => [r.ticker, r.scored?.branchId ?? '']))
  const maxT = Math.max(1, ...plan.tranches.map((t) => t.total))
  const [hover, setHover] = useState<number | null>(null)
  const trims = plan.recommendations.filter((r) => r.action === 'TRIM')
  let cum = 0
  const labelOf = (id: string) => state.nodes.find((n) => n.id === id)?.label ?? 'Other'
  const branchesOf = (buys: { ticker: string; amount: number }[]) => {
    const m = new Map<string, number>()
    for (const b of buys) {
      const k = branchOf.get(b.ticker) ?? ''
      m.set(k, (m.get(k) ?? 0) + b.amount)
    }
    // Same branch order in every column so colors stack consistently.
    return [...m].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
  }
  const order = Object.keys(colors)
  const legend = order.filter((id) => plan.tranches.some((t) => t.buys.some((b) => branchOf.get(b.ticker) === id)))

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h3 className="text-[14px] font-semibold">Buy schedule: {usdK(plan.totalBuys)} over {state.settings.horizonMonths} months</h3>
          <span className="text-[12px] muted">{state.settings.cadence} tranches · names with near-term catalysts are front-loaded {Math.round(state.settings.frontLoad * 100)}%</span>
        </div>
        <p className="text-[12.5px] ink2 mb-4">Each name is built up across tranches rather than bought at once. Re-run each tranche date with fresh prices and positions, and the schedule re-balances to whatever is still missing.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] mb-2">
          {legend.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5 ink2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colors[id] }} />{labelOf(id)}
            </span>
          ))}
        </div>
        <div className="flex items-end gap-[2px] h-40" role="img" aria-label="Dollars deployed per tranche">
          {plan.tranches.map((t) => (
            <div key={t.index} className="flex-1 h-full flex flex-col justify-end items-stretch cursor-default min-w-0"
              onMouseEnter={() => setHover(t.index)} onMouseLeave={() => setHover(null)}>
              <div className="text-[10.5px] text-center num muted mb-1 truncate">{hover === t.index || plan.tranches.length <= 8 ? usdK(t.total) : ''}</div>
              <div className="flex flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px]" style={{ height: `${(t.total / maxT) * 85}%` }}>
                {branchesOf(t.buys).map(([b, amt]) => (
                  <div key={b} style={{ flexGrow: amt, background: colors[b] ?? 'var(--muted)', opacity: hover === null || hover === t.index ? 1 : 0.5, minHeight: 2 }}
                    title={`${labelOf(b)}: ${usd(amt)}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-[2px] mt-1">
          {plan.tranches.map((t) => (
            <div key={t.index} className="flex-1 text-center text-[10.5px] muted num truncate">{t.date.slice(2, 7)}</div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plan.tranches.map((t) => {
          cum += t.total
          return (
            <div key={t.index} className="card p-4" style={hover === t.index ? { borderColor: 'var(--accent)' } : undefined}>
              <div className="flex justify-between items-baseline">
                <div className="font-semibold text-[14px]">Tranche {t.index + 1} · {new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                <div className="num font-semibold">{usdK(t.total)}</div>
              </div>
              <div className="text-[11.5px] muted mb-2 num">cumulative {usdK(cum)}</div>
              <table className="w-full text-[12.5px] num">
                <tbody>
                  {t.buys.map((b) => (
                    <tr key={b.ticker}>
                      <td className="py-0.5">
                        <span className="inline-block h-2 w-2 rounded-sm mr-1.5" style={{ background: colors[branchOf.get(b.ticker) ?? ''] }} />
                        {b.ticker}
                      </td>
                      <td className="text-right">{usd(b.amount)}</td>
                    </tr>
                  ))}
                  {t.buys.length === 0 && <tr><td className="muted">Nothing scheduled</td></tr>}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {trims.length > 0 && (
        <div className="card p-4">
          <h3 className="text-[14px] font-semibold mb-2">Optional trims</h3>
          <p className="text-[12.5px] ink2 mb-2">Only shown because "Allow trims" is on. These positions are more than 25% above target.</p>
          {trims.map((r) => <div key={r.ticker} className="text-[13px] num">{r.ticker}: trim {usd(-r.gap)}</div>)}
        </div>
      )}
    </div>
  )
}
