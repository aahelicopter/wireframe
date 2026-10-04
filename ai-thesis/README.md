# AI Thesis Portfolio

A personal tool for building a high-beta AI portfolio (default $500k) from a supply-chain thesis. It starts at GPUs and follows the chain down to the physical bottlenecks under them, for example:

`AI buildout → Networking → Optical transceivers → Lasers (EML/CW) → Indium phosphide wafers → Indium supply / MOCVD tools`

It is built for gradual, thesis-driven accumulation over 12–24 months, not trading.

## Run it

```bash
cd ai-thesis
npm install
npm run dev     # http://localhost:5174
```

## What's in it

| Tab | What it does |
|---|---|
| **Thesis map** | Interactive logic tree. Line thickness shows dollars flowing to each layer. Click a node to read why it matters, its bottleneck and catalysts, and to adjust conviction, scarcity and timing. You can edit the text, add your own sub-theses, or use **Dig deeper with AI** to research the next layer down. |
| **Plan & buys** | Factor-weight sliders (conviction, bottleneck, beta, depth, purity, small-cap, catalyst) and portfolio rules (number of names, position, branch and cash caps). Shows Buy / Add / Hold suggestions, each with the chain, a plain-English why, and links to news, quotes and filings. |
| **Deployment** | Splits the buys into monthly or quarterly tranches over the horizon. Names with near-term catalysts are front-loaded. |
| **Positions** | What you already own. Type it in or paste from a broker. The plan only suggests the gap and never sells unless you turn on "Allow trims". |
| **Universe** | About 70 seeded companies. Edit beta, size, AI purity and listing, or add new tickers to any node. |
| **Settings** | Optional Anthropic API key for AI dig-deeper and AI news scans, JSON export/import, and reset. |

Edits don't change the plan until you hit **Run**. A banner shows when inputs have changed since the last run.

## How scoring works

1. A company is scored only through thesis nodes that are switched on. Setting conviction to 0 removes a node and its subtree.
2. Seven 0–1 factors are blended with your weights. Conviction also scales the total.
3. The top N names get weight proportional to score^concentration. Then per-name and per-branch caps are applied, and names below the minimum size are dropped.
4. Targets are compared to your positions to give buy gaps, which are spread across tranches.

## Data and caveats

- Company betas, size buckets and AI purity are **rough starting estimates**. There are no live prices: you enter the last price for your positions. Correct the estimates in the Universe tab.
- AI features call the Anthropic API directly from the browser with your key, which is stored in localStorage. Only run this locally, and never deploy it publicly with a key.
- This is a thinking tool, not investment advice.
