# AI Thesis Portfolio

A personal tool for building a high-beta AI portfolio (default $15k starting book, scalable) from a supply-chain thesis. It starts at GPUs and follows the chain down to the physical bottlenecks under them, for example:

`AI buildout → Networking → Optical transceivers → Lasers (EML/CW) → Indium phosphide wafers → Indium supply / MOCVD tools`

It is built for gradual, thesis-driven accumulation over 12–24 months, not trading.

**Going live with real money? Follow [GO_LIVE.md](GO_LIVE.md).**

## Run it

```bash
cd ai-thesis
npm install
npm run dev     # http://localhost:5174
```

## What's in it

| Tab | What it does |
|---|---|
| **Today** | Daily review: refreshes prices, pulls free news, has Claude score new headlines (batched, titles only), re-plans, and proposes this period's orders for you to approve. Also shows thesis-change suggestions, news signals, and your trading agent's activity. |
| **Thesis map** | Interactive logic tree. Line thickness shows dollars flowing to each layer. Click a node to read why it matters, its bottleneck and catalysts, and to adjust conviction, scarcity and timing. You can edit the text, add your own sub-theses, or use **Dig deeper with AI** to research the next layer down. |
| **Plan & buys** | Factor-weight sliders (conviction, bottleneck, beta, depth, purity, small-cap, catalyst) and portfolio rules (number of names, position, branch and cash caps). Shows Buy / Add / Hold suggestions, each with the chain, a plain-English why, and links to news, quotes and filings. |
| **Deployment** | Splits the buys into monthly or quarterly tranches over the horizon. Names with near-term catalysts are front-loaded. |
| **News** | Free headline feed for your holdings, planned buys and top thesis themes, with SEC filings for US names you hold. Filter by group or keyword. |
| **Positions** | What you already own. Type it in or paste from a broker (ticker, shares, avg cost). Live prices fill in automatically. The plan only suggests the gap and never sells unless you turn on "Allow trims". |
| **Universe** | About 70 seeded companies. Edit beta, size, AI purity and listing, or add new tickers to any node. |
| **Settings** | Optional Anthropic API key for AI dig-deeper and AI news scans, JSON export/import, and reset. |

## Live prices

Quotes come from Yahoo Finance's public chart endpoint, with no API key. Because browsers can't call Yahoo directly, the Vite dev/preview server proxies `/api/yahoo` (see `vite.config.ts`), so run the app with `npm run dev` or `npm run preview`. Opening `dist/index.html` straight from disk won't load prices.

- Prices load when the app opens and every 5 minutes while it's open (toggle on the Positions tab). The header button shows the last update and refreshes on click. A dot means some quotes failed; hover for details.
- Non-US listings (Korea, Taiwan, Japan, Europe, London pence) are converted to USD with live FX.
- Typing a price on a position marks it **manual**, and live updates leave it alone. Click "use live" to switch back.
- If the plan was up to date, it re-runs automatically with the new prices. Buy suggestions and tranches show approximate share counts.
- Yahoo quotes can be delayed about 15 minutes, and the endpoint is unofficial, so it may rate-limit or change.

## News (free, no keys)

| Source | Used for | Notes |
|---|---|---|
| Yahoo Finance RSS | Headlines per ticker, including non-US symbols | Unofficial, can rate-limit |
| Google News RSS | Thesis-theme searches (each node's "news search terms") and company names | Last 14–30 days |
| SEC EDGAR Atom | 8-K / 10-Q / 10-K filings for US tickers | SEC asks for a contact: set `SEC_USER_AGENT="Your Name you@domain.com"` in `ai-thesis/.env.local` |

All three go through the same local proxy as prices and are cached for 15 minutes. Headlines appear in the **News** tab, in each node's panel, and in each expanded buy suggestion. **AI thesis read** is the only paid option: Claude does a live web search and says what each story means for the thesis, using your Anthropic API key.

Edits don't change the plan until you hit **Run**. A banner shows when inputs have changed since the last run.

## How scoring works

1. A company is scored only through thesis nodes that are switched on. Setting conviction to 0 removes a node and its subtree.
2. Seven 0–1 factors are blended with your weights. Conviction also scales the total.
3. The top N names get weight proportional to score^concentration. Then per-name and per-branch caps are applied, and names below the minimum size are dropped.
4. Targets are compared to your positions to give buy gaps, which are spread across tranches.

## News → thesis → portfolio

1. Each review collects free headlines for holdings, planned buys and the 8 most-funded thesis layers.
2. Headlines never seen before go to Claude in **one batched call** (titles only, low effort, JSON-schema output). Each headline is sent at most once. Headlines that turn out to be noise are remembered and skipped next time.
3. Scored headlines become a −1…+1 signal per ticker and per thesis layer, fading with a 7-day half-life. That signal feeds the **News flow** factor (weight on the Plan tab).
4. A name with a strongly negative signal (≤ −0.5) has new buys paused until the news fades or you act.
5. When several headlines point the same way, Claude suggests a conviction or scarcity change. You accept or dismiss it; nothing changes on its own.

Token usage and estimated cost are tracked in Settings. A typical review with ~30 new headlines is about 1–2k input tokens.

## Orders and your broker

Reviews turn the current tranche (plus trims and thesis-break exits, if enabled) into **proposed** limit orders. You approve them on the Today tab. A trading agent with your brokerage connection (for example Robinhood) picks up only the approved orders from the local API, places them and reports fills, which update your positions. See [AGENT.md](AGENT.md) for the protocol and safety rules.

**Guardrails:** a kill switch (header button, the agent's `POST /halt`, or a `.data/HALT` file), hard price guards checked before every order (stale quote over 15 min, price move over 3%, market closed), and suggested per-order and per-day buy sizes that shape proposals without blocking your approvals. You can also execute by hand and click **Mark filled**.

## Data and caveats

- Company betas, size buckets and AI purity are **rough starting estimates**. Correct them in the Universe tab.
- AI features call the Anthropic API directly from the browser with your key, which is stored in localStorage. Only run this locally, and never deploy it publicly with a key.
- This is a thinking tool, not investment advice.
