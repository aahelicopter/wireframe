import type { Store } from '../lib/store'
import { DEFAULT_SETTINGS } from '../lib/store'
import { FACTOR_LABELS } from '../engine/allocate'
import type { FactorKey } from '../types'

export function WeightsPanel({ store }: { store: Store }) {
  const { state, updateSettings } = store
  const s = state.settings
  const setW = (k: FactorKey, v: number) => updateSettings({ weights: { ...s.weights, [k]: v } })

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="label">Factor weights</div>
          <button className="text-[12px] link" onClick={() => updateSettings({ weights: DEFAULT_SETTINGS.weights })}>Reset</button>
        </div>
        {(Object.keys(FACTOR_LABELS) as FactorKey[]).map((k) => (
          <label key={k} className="block text-[13px]" title={FACTOR_LABELS[k].hint}>
            <div className="flex justify-between"><span>{FACTOR_LABELS[k].label}</span><span className="num font-semibold">{s.weights[k]}</span></div>
            <input type="range" min={0} max={10} step={1} value={s.weights[k]} onChange={(e) => setW(k, Number(e.target.value))} />
            <div className="text-[11px] muted -mt-0.5">{FACTOR_LABELS[k].hint}</div>
          </label>
        ))}
      </section>

      <section className="space-y-3">
        <div className="label">Portfolio shape</div>
        <Num label="Number of positions" value={s.numPositions} min={3} max={50} step={1} onChange={(v) => updateSettings({ numPositions: v })} />
        <Num label="Max per position" suffix="%" value={s.maxPositionPct} min={2} max={25} step={0.5} onChange={(v) => updateSettings({ maxPositionPct: v })} />
        <Num label="Min per position" suffix="%" value={s.minPositionPct} min={0} max={5} step={0.25} onChange={(v) => updateSettings({ minPositionPct: v })} />
        <Num label="Max per top-level branch" suffix="%" value={s.maxBranchPct} min={10} max={100} step={5} onChange={(v) => updateSettings({ maxBranchPct: v })} />
        <Num label="Cash reserve" suffix="%" value={s.cashReservePct} min={0} max={50} step={1} onChange={(v) => updateSettings({ cashReservePct: v })} />
        <Num label="Concentration" value={s.concentration} min={0.5} max={4} step={0.25} onChange={(v) => updateSettings({ concentration: v })}
          hint="Higher puts more weight in the top-scored names" />
      </section>

      <section className="space-y-2">
        <div className="label">Rules</div>
        <Toggle label="US-listed only" checked={s.usOnly} onChange={(v) => updateSettings({ usOnly: v })} hint="Off adds Taiwan, Korea, Japan, EU and China A-share names" />
        <Toggle label="Favor what I already own" checked={s.favorHoldings} onChange={(v) => updateSettings({ favorHoldings: v })} hint="Avoids churn: held names get a 15% score boost" />
        <Toggle label="Allow trims" checked={s.allowTrims} onChange={(v) => updateSettings({ allowTrims: v })} hint="Off: never suggests selling, just stops adding" />
      </section>

      <section className="space-y-3">
        <div className="label">Deployment</div>
        <Num label="Horizon" suffix=" mo" value={s.horizonMonths} min={3} max={24} step={3} onChange={(v) => updateSettings({ horizonMonths: v })} />
        <div className="flex items-center justify-between text-[13px]">
          <span>Cadence</span>
          <select className="input !w-auto" value={s.cadence} onChange={(e) => updateSettings({ cadence: e.target.value as 'monthly' | 'quarterly' })}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
        <Num label="Front-load near-term catalysts" value={s.frontLoad} min={0} max={1} step={0.1} onChange={(v) => updateSettings({ frontLoad: v })}
          hint="0 = even dollar-cost averaging" />
        <label className="flex items-center justify-between text-[13px] gap-3">
          <span>Start date</span>
          <input type="date" className="input !w-auto" value={s.startDate} onChange={(e) => updateSettings({ startDate: e.target.value })} />
        </label>
      </section>
    </div>
  )
}

function Num({ label, value, min, max, step, suffix = '', hint, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix?: string; hint?: string; onChange: (v: number) => void
}) {
  return (
    <label className="block text-[13px]">
      <div className="flex justify-between"><span>{label}</span><span className="num font-semibold">{value}{suffix}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <div className="text-[11px] muted -mt-0.5">{hint}</div>}
    </label>
  )
}

function Toggle({ label, checked, hint, onChange }: { label: string; checked: boolean; hint?: string; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 text-[13px] cursor-pointer">
      <input type="checkbox" className="mt-0.5" style={{ accentColor: 'var(--accent)' }} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}{hint && <span className="block text-[11px] muted">{hint}</span>}</span>
    </label>
  )
}
