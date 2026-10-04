import Anthropic from '@anthropic-ai/sdk'
import type { CapSize, Timing } from '../types'

/**
 * Optional AI features. The key the user pastes in Settings is kept in this
 * browser's localStorage and sent straight to the Anthropic API. Fine for a
 * personal, local tool. Don't deploy this publicly with a shared key.
 */
const MODEL = 'claude-opus-5-5'

function client(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

type Msg = Anthropic.Beta.BetaMessageParam

/** Run a web-search-enabled request to completion, resuming on pause_turn. */
async function searchAndAnswer(apiKey: string, system: string, prompt: string, maxSearches: number) {
  const c = client(apiKey)
  const messages: Msg[] = [{ role: 'user', content: prompt }]
  const sources: { title: string; url: string; age: string | null }[] = []
  for (let turn = 0; turn < 4; turn++) {
    const res = await c.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 32000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        system,
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxSearches }],
        messages,
      })
      .finalMessage()

    for (const b of res.content) {
      if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
        for (const r of b.content) sources.push({ title: r.title, url: r.url, age: r.page_age })
      }
    }
    if (res.stop_reason === 'refusal') throw new Error('The model declined this request.')
    if (res.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: res.content })
      continue
    }
    const text = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
    return { text, sources }
  }
  throw new Error('The search did not finish. Try again.')
}

function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : text
  const start = body.search(/[[{]/)
  const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'))
  if (start < 0 || end < start) throw new Error('Could not read the AI response.')
  return JSON.parse(body.slice(start, end + 1)) as T
}

export function describeError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'API key was rejected. Check it in Settings.'
  if (e instanceof Anthropic.RateLimitError) return 'Rate limited. Wait a minute and retry.'
  if (e instanceof Anthropic.APIError) return `API error ${e.status ?? ''}: ${e.message}`
  if (e instanceof Error) return e.message
  return String(e)
}

export interface AiSubNode {
  label: string
  summary: string
  bottleneck: string
  scarcity: number
  timing: Timing
  catalysts: string[]
  companies: {
    ticker: string
    name: string
    yahoo: string
    usListed: boolean
    beta: number
    cap: CapSize
    purity: number
    role: string
  }[]
}

export async function digDeeper(
  apiKey: string,
  chain: string[],
  nodeSummary: string,
  knownTickers: string[],
): Promise<AiSubNode[]> {
  const system =
    'You are a buy-side semiconductor and infrastructure supply-chain analyst. You map AI investment theses one level further down the supply chain, to the physical inputs, tools and materials that constrain the layer above. Only name real, publicly listed companies. Be explicit about uncertainty in the text fields.'
  const prompt = `Thesis chain so far (top → current):
${chain.join(' → ')}

Current node thesis: ${nodeSummary}

Search the web for recent information, then propose 2 to 4 sub-theses that sit ONE level further down the supply chain from "${chain[chain.length - 1]}". Each should be a specific bottleneck (a material, component, tool or capacity type) that limits the current node. For each, list 1 to 5 publicly listed companies with real exposure. Prefer pure plays and higher-beta names. Include non-US listings when they are the real chokepoint. Tickers already tracked: ${knownTickers.join(', ')}. You may reuse them.

Reply with only a JSON array in a \`\`\`json block, matching:
[{"label": string, "summary": string (2-3 sentences: why it matters to the parent), "bottleneck": string, "scarcity": 1-5, "timing": "now"|"6-12m"|"12-24m", "catalysts": string[], "companies": [{"ticker": string (US ticker, or a short uppercase name for non-US), "name": string, "yahoo": string (Yahoo Finance symbol, e.g. 6857.T), "usListed": boolean, "beta": number (estimated), "cap": "mega"|"large"|"mid"|"small", "purity": 0-1 (share of business exposed to this thesis), "role": string}]}]`
  const { text } = await searchAndAnswer(apiKey, system, prompt, 6)
  const parsed = extractJson<AiSubNode[]>(text)
  if (!Array.isArray(parsed)) throw new Error('Unexpected AI response shape.')
  return parsed
}

export interface NewsItem {
  title: string
  url: string
  source: string
  date: string
  takeaway: string
}

export async function findNews(apiKey: string, subject: string, context: string): Promise<NewsItem[]> {
  const system =
    'You are an equity research assistant. Find recent, specific news and primary sources, and explain in one line how each affects the investment thesis. Only include URLs that came from your search results.'
  const today = new Date().toISOString().slice(0, 10)
  const prompt = `Today is ${today}. Find the 4-6 most relevant news items or primary sources from the last ~90 days for: ${subject}
Thesis context: ${context}

Reply with only a JSON array in a \`\`\`json block: [{"title": string, "url": string, "source": string, "date": "YYYY-MM-DD or best guess", "takeaway": string (one sentence: bullish/bearish for the thesis and why)}]`
  const { text, sources } = await searchAndAnswer(apiKey, system, prompt, 5)
  const allowed = new Set(sources.map((s) => s.url))
  let items: NewsItem[] = []
  try {
    items = extractJson<NewsItem[]>(text)
  } catch {
    items = []
  }
  // Keep only links that actually came back from search.
  items = items.filter((i) => i && typeof i.url === 'string' && allowed.has(i.url))
  if (!items.length) {
    items = sources.slice(0, 6).map((s) => ({ title: s.title, url: s.url, source: new URL(s.url).hostname, date: s.age ?? '', takeaway: '' }))
  }
  return items
}
