import { useState } from 'react'
import { ExternalLink, Loader2, Sparkles } from 'lucide-react'
import { describeError, findNews, type NewsItem } from '../lib/claude'
import { newsUrl } from '../lib/format'

interface Props {
  apiKey: string
  subject: string
  context: string
  query: string
  extraLinks?: { label: string; href: string }[]
}

/** Search links that always work, plus an optional AI news scan. */
export function NewsBox({ apiKey, subject, context, query, extraLinks = [] }: Props) {
  const [items, setItems] = useState<NewsItem[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const scan = async () => {
    setBusy(true)
    setErr('')
    try {
      setItems(await findNews(apiKey, subject, context))
    } catch (e) {
      setErr(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
        <a className="link inline-flex items-center gap-1" href={newsUrl(query)} target="_blank" rel="noreferrer">
          Google News <ExternalLink size={12} />
        </a>
        {extraLinks.map((l) => (
          <a key={l.href} className="link inline-flex items-center gap-1" href={l.href} target="_blank" rel="noreferrer">
            {l.label} <ExternalLink size={12} />
          </a>
        ))}
        <button
          className="link inline-flex items-center gap-1 disabled:opacity-50"
          onClick={scan}
          disabled={!apiKey || busy}
          title={apiKey ? 'Search recent news with Claude' : 'Add an Anthropic API key in Settings to enable'}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {busy ? 'Scanning news…' : 'AI news scan'}
        </button>
      </div>
      {err && <p className="text-[12px]" style={{ color: 'var(--bad)' }}>{err}</p>}
      {items && (
        <ul className="space-y-2">
          {items.length === 0 && <li className="muted text-[12px]">Nothing relevant found.</li>}
          {items.map((i) => (
            <li key={i.url} className="text-[12.5px] leading-snug">
              <a className="link font-medium" href={i.url} target="_blank" rel="noreferrer">
                {i.title}
              </a>
              <span className="muted"> · {i.source}{i.date ? ` · ${i.date}` : ''}</span>
              {i.takeaway && <div className="ink2">{i.takeaway}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
