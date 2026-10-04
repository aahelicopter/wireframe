import { Loader2, RefreshCw } from 'lucide-react'
import type { Store } from '../lib/store'

/** Header control: shows how fresh live prices are and refreshes them. */
export function PriceStatusButton({ store }: { store: Store }) {
  const { state, priceStatus, refreshPrices } = store
  const at = state.quotesAt ? new Date(state.quotesAt) : null
  const failed = !priceStatus.busy && priceStatus.errors.length > 0
  const label = priceStatus.busy
    ? 'Updating prices…'
    : at
      ? `Prices ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : 'No live prices'
  const title = failed
    ? `Some quotes failed (${priceStatus.errors.length}):\n${priceStatus.errors.slice(0, 8).join('\n')}`
    : 'Live quotes from Yahoo Finance (may be delayed ~15 min). Click to refresh.'
  return (
    <button className="btn !py-1 text-[12px]" onClick={() => void refreshPrices()} disabled={priceStatus.busy} title={title}>
      {priceStatus.busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
      <span className="num">{label}</span>
      {failed && <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--warn)' }} aria-label="some quotes failed" />}
    </button>
  )
}

export function DayChange({ pct }: { pct: number }) {
  const color = pct > 0 ? 'var(--good)' : pct < 0 ? 'var(--bad)' : 'var(--muted)'
  return <span className="num" style={{ color }}>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</span>
}
