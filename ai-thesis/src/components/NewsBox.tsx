import { useEffect, useState } from 'react'
import { ExternalLink, FileText, Loader2, Sparkles } from 'lucide-react'
import { describeError, thesisRead, type AiCtx, type ThesisRead } from '../lib/claude'
import { newsUrl } from '../lib/format'
import { headlineId } from '../engine/signals'
import type { ScoredHeadline } from '../types'
import { gather, googleNews, secFilings, timeAgo, yahooHeadlines, type Headline } from '../lib/news'

interface Props {
  ai: AiCtx
  subject: string
  context: string
  /** Google News search terms. */
  query: string
  /** Set for a company: adds Yahoo headlines and (US only) SEC filings. */
  company?: { ticker: string; yahoo: string; usListed: boolean }
  extraLinks?: { label: string; href: string }[]
}

/** Free headlines that load on open, plus an optional paid AI news scan. */
export function NewsBox({ ai: aiCtx, subject, context, query, company, extraLinks = [] }: Props) {
  const [free, setFree] = useState<{ loading: boolean; items: Headline[]; failed: number }>({ loading: true, items: [], failed: 0 })
  const [showAll, setShowAll] = useState(false)
  const [ai, setAi] = useState<ThesisRead | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let live = true
    const loaders = [() => googleNews(query)]
    if (company) {
      loaders.push(() => yahooHeadlines(company.yahoo))
      if (company.usListed) loaders.push(() => secFilings(company.ticker))
    }
    gather(loaders).then((r) => live && setFree({ loading: false, ...r }))
    return () => {
      live = false
    }
  }, [query, company?.ticker, company?.yahoo, company?.usListed])

  const scan = async () => {
    setBusy(true)
    setErr('')
    try {
      // Reuses the free headlines above: no web search, low effort.
      setAi(await thesisRead(aiCtx, subject, context, free.items))
    } catch (e) {
      setErr(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  const items = showAll ? free.items : free.items.slice(0, 6)

  return (
    <div className="space-y-2">
      {free.loading ? (
        <p className="text-[12px] muted inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading headlines…</p>
      ) : (
        <>
          <HeadlineList items={items} />
          {free.items.length === 0 && (
            <p className="text-[12px] muted">
              {free.failed ? 'News feeds unreachable. Is the app running with npm run dev?' : 'No recent headlines.'}
            </p>
          )}
          {free.items.length > 6 && (
            <button className="link text-[12px]" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show fewer' : `Show all ${free.items.length}`}
            </button>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] pt-1">
        <a className="link inline-flex items-center gap-1" href={newsUrl(query)} target="_blank" rel="noreferrer">
          Google News <ExternalLink size={11} />
        </a>
        {extraLinks.map((l) => (
          <a key={l.href} className="link inline-flex items-center gap-1" href={l.href} target="_blank" rel="noreferrer">
            {l.label} <ExternalLink size={11} />
          </a>
        ))}
        <button
          className="link inline-flex items-center gap-1 disabled:opacity-50"
          onClick={scan}
          disabled={!aiCtx.apiKey || busy || free.items.length === 0}
          title={aiCtx.apiKey ? 'Claude reads the headlines above and says what they mean for the thesis (uses your API credits, no web search)' : 'Add an Anthropic API key in Settings to enable'}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {busy ? 'Analyzing…' : 'AI thesis read (paid)'}
        </button>
      </div>
      {err && <p className="text-[12px]" style={{ color: 'var(--bad)' }}>{err}</p>}
      {ai && (
        <div className="space-y-2 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[12.5px]">{ai.summary}</p>
          <ul className="space-y-1.5">
            {ai.items.filter((i) => free.items[i.n]).map((i) => (
              <li key={i.n} className="text-[12.5px] leading-snug flex gap-1.5">
                <ImpactBadge impact={i.impact} />
                <div>
                  <a className="link" href={free.items[i.n].url} target="_blank" rel="noreferrer">{free.items[i.n].title}</a>
                  <div className="ink2">{i.takeaway}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function HeadlineList({ items, showTag = false, scores }: { items: Headline[]; showTag?: boolean; scores?: Record<string, ScoredHeadline> }) {
  return (
    <ul className="space-y-1.5">
      {items.map((h) => (
        <li key={h.url} className="text-[12.5px] leading-snug flex gap-1.5">
          {scores?.[headlineId(h.url, h.title)] && <ImpactBadge impact={scores[headlineId(h.url, h.title)].impact} />}
          {h.source === 'sec' && <FileText size={13} className="shrink-0 mt-[2px]" style={{ color: 'var(--warn)' }} aria-label="SEC filing" />}
          <div className="min-w-0">
            <a className="link" href={h.url} target="_blank" rel="noreferrer">{h.title}</a>
            <div className="muted text-[11.5px]">
              {showTag && h.tag && <span className="chip mr-1.5 !py-0">{h.tag}</span>}
              {h.publisher}{h.date ? ` · ${timeAgo(h.date)}` : ''}
              {scores?.[headlineId(h.url, h.title)] && <span className="ink2"> · {scores[headlineId(h.url, h.title)].note}</span>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ImpactBadge({ impact }: { impact: number }) {
  const color = impact > 0 ? 'var(--good)' : impact < 0 ? 'var(--bad)' : 'var(--muted)'
  return (
    <span className="chip !px-1.5 !py-0 shrink-0 num self-start mt-[1px]" style={{ color, borderColor: color }} title="Thesis impact, -2 to +2">
      {impact > 0 ? '+' : ''}{impact}
    </span>
  )
}
