import Anthropic from '@anthropic-ai/sdk'
import type { AiUsage, CapSize, Timing } from '../types'

/**
 * Optional AI features. The key the user pastes in Settings is kept in this
 * browser's localStorage and sent straight to the Anthropic API. Fine for a
 * personal, local tool. Don't deploy this publicly with a shared key.
 *
 * Token budget, cheapest first:
 *  - scoreHeadlines: titles only (no article bodies, no web search), batched
 *    for the whole portfolio, low effort, JSON schema output, and each headline
 *    is scored once (callers skip ones already scored).
 *  - thesisRead: reuses the free headlines already on screen, no web search.
 *  - digDeeper: the only call that searches the web, capped at 3 searches.
 */

export type AiModel = 'claude-opus-5-5' | 'claude-sonnet-5-5'

export const AI_MODELS: { id: AiModel; label: string; inPerM: number; outPerM: number; cachePerM: number }[] = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (best judgment)', inPerM: 4, outPerM: 20, cachePerM: 0.2 },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (about half the cost)', inPerM: 2, outPerM: 10, cachePerM: 0.2 },
]

export type UsageSink = (u: AiUsage) => void

export interface AiCtx {
  apiKey: string
  model: AiModel
  onUsage?: UsageSink
}

function client(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

function record(ctx: AiCtx, res: Anthropic.Beta.BetaMessage) {
  if (!ctx.onUsage) return
  const price = AI_MODELS.find((m) => m.id === res.model) ?? AI_MODELS.find((m) => m.id === ctx.model)!
  const u = res.usage
  const input = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0)
  const cacheRead = u.cache_read_input_tokens ?? 0
  const output = u.output_tokens ?? 0
  ctx.onUsage({
    calls: 1,
    inputTokens: input,
    outputTokens: output,
    cacheReadTokens: cacheRead,
    searches: u.server_tool_use?.web_search_requests ?? 0,
    costUsd: (input * price.inPerM + output * price.outPerM + cacheRead * price.cachePerM) / 1e6,
  })
}

function textOf(res: Anthropic.Beta.BetaMessage) {
  return res.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
}

function checkStop(res: Anthropic.Beta.BetaMessage) {
  if (res.stop_reason === 'refusal') throw new Error('The model declined this request.')
  if (res.stop_reason === 'max_tokens') throw new Error('The response was cut off. Try fewer items.')
}

/** One JSON-schema call with no tools. Cheap and always parseable. */
async function structured<T>(ctx: AiCtx, system: string, prompt: string, schema: Record<string, unknown>, maxTokens: number): Promise<T> {
  const res = await client(ctx.apiKey).beta.messages.create({
    model: ctx.model,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    system,
    messages: [{ role: 'user', content: prompt }],
  })
  record(ctx, res)
  checkStop(res)
  return JSON.parse(textOf(res)) as T
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

// ---------- Dig deeper (web search) ----------

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

export async function digDeeper(ctx: AiCtx, chain: string[], nodeSummary: string, knownTickers: string[]): Promise<AiSubNode[]> {
  const system =
    'You are a buy-side supply-chain analyst. Map an AI investment thesis one level further down the supply chain, to the materials, components, tools or capacity that constrain the layer above. Name only real, publicly listed companies. Be brief.'
  const prompt = `Chain: ${chain.join(' > ')}
Node thesis: ${nodeSummary}
Already tracked: ${knownTickers.join(',')}

Use at most a few web searches. Propose 2-4 sub-theses ONE level below "${chain[chain.length - 1]}", each a specific bottleneck, with 1-5 listed companies (prefer pure plays, higher beta; non-US allowed if they are the real chokepoint).
Reply with only a JSON array in a \`\`\`json block:
[{"label":str,"summary":str (2 sentences),"bottleneck":str,"scarcity":1-5,"timing":"now"|"6-12m"|"12-24m","catalysts":[str],"companies":[{"ticker":str,"name":str,"yahoo":str,"usListed":bool,"beta":num,"cap":"mega"|"large"|"mid"|"small","purity":0-1,"role":str}]}]`

  const c = client(ctx.apiKey)
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: prompt }]
  for (let turn = 0; turn < 3; turn++) {
    const res = await c.beta.messages
      .stream({
        model: ctx.model,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system,
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }],
        messages,
      })
      .finalMessage()
    record(ctx, res)
    if (res.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: res.content })
      continue
    }
    checkStop(res)
    const parsed = extractJson<AiSubNode[]>(textOf(res))
    if (!Array.isArray(parsed)) throw new Error('Unexpected AI response shape.')
    return parsed
  }
  throw new Error('The search did not finish. Try again.')
}

// ---------- Thesis read on headlines we already have (no web search) ----------

export interface ThesisRead {
  summary: string
  items: { n: number; impact: number; takeaway: string }[]
}

const IMPACT_ENUM = [-2, -1, 0, 1, 2]

export async function thesisRead(
  ctx: AiCtx,
  subject: string,
  context: string,
  headlines: { title: string; publisher: string; date: string }[],
): Promise<ThesisRead> {
  const list = headlines
    .slice(0, 20)
    .map((h, i) => `${i}|${h.date.slice(0, 10)}|${h.publisher}|${h.title}`)
    .join('\n')
  return structured<ThesisRead>(
    ctx,
    'You are an equity analyst. Judge headlines against an investment thesis. Be terse. Only use what the headlines say.',
    `Subject: ${subject}\nThesis: ${context}\nHeadlines (n|date|publisher|title):\n${list}\n\nReturn a 1-2 sentence summary of what the news means for the thesis, and for each headline that matters an impact (-2 thesis-breaking .. +2 strongly supportive) and a takeaway of at most 15 words. Skip irrelevant headlines.`,
    {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'items'],
      properties: {
        summary: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['n', 'impact', 'takeaway'],
            properties: { n: { type: 'integer' }, impact: { type: 'integer', enum: IMPACT_ENUM }, takeaway: { type: 'string' } },
          },
        },
      },
    },
    6000,
  )
}

// ---------- Batched headline scoring for the daily review ----------

export interface ScoreInput {
  /** Short local index used in the prompt instead of the URL. */
  n: number
  tag: string
  date: string
  publisher: string
  title: string
}

export interface ScoreOutput {
  scores: { n: number; subject: string; impact: number; relevance: number; note: string }[]
  proposals: { nodeId: string; field: 'conviction' | 'scarcity'; delta: number; reason: string; evidence: number[] }[]
}

/**
 * Score up to ~150 headline titles in one call. `thesis` is a compact list of
 * node ids/labels/conviction and tickers so Claude can map each headline to a
 * subject and suggest conviction changes.
 */
export async function scoreHeadlines(ctx: AiCtx, thesis: string, items: ScoreInput[]): Promise<ScoreOutput> {
  const list = items.map((h) => `${h.n}|${h.tag}|${h.date.slice(0, 10)}|${h.publisher}|${h.title}`).join('\n')
  return structured<ScoreOutput>(
    ctx,
    'You score news headlines for an AI-infrastructure investment thesis with a 12-24 month horizon. Judge only what each title says. Ignore price-move recaps, listicles and promotional pieces. Be conservative: most headlines are noise.',
    `THESIS (node id: label [conviction/5]; tickers held or planned):
${thesis}

HEADLINES (n|tag|date|publisher|title):
${list}

1. scores: include ONLY headlines with real thesis information. subject = the ticker or node id it is mainly about. impact -2 (thesis-breaking) .. +2 (strongly supportive). relevance 1-3. note: at most 12 words.
2. proposals: at most 3, only when several headlines clearly point the same way. A conviction or scarcity change of +1 or -1 on a node id from the thesis list. evidence = headline n values.`,
    {
      type: 'object',
      additionalProperties: false,
      required: ['scores', 'proposals'],
      properties: {
        scores: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['n', 'subject', 'impact', 'relevance', 'note'],
            properties: {
              n: { type: 'integer' },
              subject: { type: 'string' },
              impact: { type: 'integer', enum: IMPACT_ENUM },
              relevance: { type: 'integer', enum: [1, 2, 3] },
              note: { type: 'string' },
            },
          },
        },
        proposals: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['nodeId', 'field', 'delta', 'reason', 'evidence'],
            properties: {
              nodeId: { type: 'string' },
              field: { type: 'string', enum: ['conviction', 'scarcity'] },
              delta: { type: 'integer', enum: [-1, 1] },
              reason: { type: 'string' },
              evidence: { type: 'array', items: { type: 'integer' } },
            },
          },
        },
      },
    },
    12000,
  )
}
