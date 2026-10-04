import { useEffect, useState } from 'react'
import { ExternalLink, FileText, Loader2, Sparkles } from 'lucide-react'
import { describeError, findNews, type NewsItem } from '../lib/claude'
import { newsUrl } from '../lib/format'
import { gather, googleNews, secFilings, timeAgo, yahooHeadlines, type Headline } from '../lib/news'

interface Props {
  apiKey: string
  subject: string
  context: string
  /** Google News search terms. */
  query: string
  /** Set for a company: adds Yahoo headlines and (US only) SEC filings. */
  company?: { ticker: string; yahoo: string; usListed: boolean }
  extraLinks?: { label: string; href: string }[]
}

/** Free headlines that load on open, plus an optional paid AI news scan. */
export function NewsBox({ apiKey, subject, context, query, company, extraLinks = [] }: Props) {
  const [free, setFree] = useState<{ loading: boolean; items: Headline[]; failed: number }>({ loading: true, items: [], failed: 0 })
  const [showAll, setShowAll] = useState(false)
  const [ai, setAi] = useState<NewsItem[] | null>(null)
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
      setAi(await findNews(apiKey, subject, context))
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
          disabled={!apiKey || busy}
          title={apiKey ? 'Claude searches the web and says what each story means for the thesis (uses your API credits)' : 'Add an Anthropic API key in Settings to enable'}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {busy ? 'Analyzing…' : 'AI thesis read (paid)'}
        </button>
      </div>
      {err && <p className="text-[12px]" style={{ color: 'var(--bad)' }}>{err}</p>}
      {ai && (
        <ul className="space-y-2 border-t pt-2" style={{ borderColor: 'var(--border)' }}>
          {ai.length === 0 && <li className="muted text-[12px]">Nothing relevant found.</li>}
          {ai.map((i) => (
            <li key={i.url} className="text-[12.5px] leading-snug">
              <a className="link font-medium" href={i.url} target="_blank" rel="noreferrer">{i.title}</a>
              <span className="muted"> · {i.source}{i.date ? ` · ${i.date}` : ''}</span>
              {i.takeaway && <div className="ink2">{i.takeaway}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function HeadlineList({ items, showTag = false }: { items: Headline[]; showTag?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {items.map((h) => (
        <li key={h.url} className="text-[12.5px] leading-snug flex gap-1.5">
          {h.source === 'sec' && <FileText size={13} className="shrink-0 mt-[2px]" style={{ color: 'var(--warn)' }} aria-label="SEC filing" />}
          <div className="min-w-0">
            <a className="link" href={h.url} target="_blank" rel="noreferrer">{h.title}</a>
            <div className="muted text-[11.5px]">
              {showTag && h.tag && <span className="chip mr-1.5 !py-0">{h.tag}</span>}
              {h.publisher}{h.date ? ` · ${timeAgo(h.date)}` : ''}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
