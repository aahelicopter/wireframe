import { XOctagon, Play } from 'lucide-react'
import type { AgentLink } from '../lib/agentSync'

/** Header control. Halting is instant; resuming asks for confirmation. */
export function KillSwitchButton({ agent }: { agent: AgentLink }) {
  if (agent.halt.on) {
    return (
      <button
        className="btn !py-1 text-[12px] font-semibold"
        style={{ background: 'var(--bad)', borderColor: 'var(--bad)', color: '#fff' }}
        title={`Halted${agent.halt.by ? ` by ${agent.halt.by}` : ''}: ${agent.halt.reason}. Click to resume.`}
        onClick={() => {
          if (agent.halt.by === 'file') return alert('Halted by the file ai-thesis/.data/HALT. Delete that file to resume.')
          if (confirm('Resume trading? Approved orders become available to your agent again.')) void agent.setHalt(false)
        }}
      >
        <Play size={13} /> Halted · resume
      </button>
    )
  }
  return (
    <button
      className="btn !py-1 text-[12px] font-semibold"
      style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}
      title="Stop all trading now: the agent gets no orders and is told to cancel anything still open at the broker."
      onClick={() => {
        const reason = prompt('Kill switch: why are you halting? (optional)', '')
        if (reason !== null) void agent.setHalt(true, reason || 'halted from app')
      }}
    >
      <XOctagon size={13} /> Kill switch
    </button>
  )
}

export function HaltBanner({ agent }: { agent: AgentLink }) {
  if (!agent.halt.on) return null
  return (
    <div className="mb-4 card px-4 py-3 text-[13px] flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--bad)', background: 'color-mix(in srgb, var(--bad) 10%, var(--surface))' }}>
      <XOctagon size={16} style={{ color: 'var(--bad)' }} />
      <b>Trading halted.</b>
      <span className="ink2">
        {agent.halt.reason}{agent.halt.by ? ` (by ${agent.halt.by})` : ''}. Your agent receives no orders and is told to cancel anything still open at Robinhood. Reviews still run, but propose nothing.
      </span>
    </div>
  )
}
