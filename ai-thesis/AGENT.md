# Trading agent protocol

The app proposes orders. **You approve them in the Today tab.** An agent that has your brokerage connection (for example a Claude agent connected to Robinhood) executes only the approved ones and reports back.

```
review (daily / every other day)  →  proposed orders  →  you approve  →  agent places them  →  agent reports fills  →  positions update
```

The API runs inside the app's dev/preview server (`npm run dev`) on **127.0.0.1:5174 only**. State lives in `ai-thesis/.data/agent.json`, which is git-ignored.

## Auth

Every agent call needs `Authorization: Bearer <token>`. Copy the token, or a ready-made agent prompt, from **Settings → Trading agent**. To rotate it, stop the server, delete `token` from `.data/agent.json` and restart.

## Endpoints (base `http://127.0.0.1:5174/api/agent`)

| Method | Path | What it does |
|---|---|---|
| GET | `/status` | `{ approvedOrders, briefAt, lastAgentAt }`. Cheap check for whether there's work. |
| GET | `/brief` | Latest review as Markdown, plus live order status. Add `?format=json` for JSON. |
| GET | `/orders` | Approved, unexpired orders only, with execution instructions. |
| POST | `/orders/{id}` | Report progress: `{"status":"sent","brokerOrderId":"…"}`, `{"status":"filled","fill":{"qty":10,"avgPrice":101.2}}` or `{"status":"failed","note":"why"}` |
| PUT | `/positions` | Push broker holdings: `{"positions":[{"ticker":"LITE","shares":12,"avgCost":98.2}]}`. The app asks you before using them. |

Each order has `side` (BUY/SELL), `ticker`, `qty` (shares, fractional only if you turned that on), `limitPrice`, `expiresAt`, `reason` and `kind` (tranche / trim / exit).

## Guarantees enforced by the server

- An agent **cannot** create, approve, resize or reprice orders. Only the app in your browser can do that, because those endpoints accept only same-origin browser requests.
- Status can only move `approved → sent | filled | failed` and `sent → filled | failed`.
- A fill larger than the approved quantity is rejected.
- Approved orders expire at the end of the next day if not acted on.
- The server listens on localhost only.

## Suggested schedule

1. You open the app. If a review is due, it runs automatically. You approve or reject orders on the Today tab.
2. Your agent runs on a schedule (for example 30 minutes after market open): `GET /status`, then `GET /orders`, places them, and reports.
3. A later agent run checks fills, `POST`s them, and `PUT`s positions.
4. The agent can message you the `GET /brief` summary.

The app must be running (`npm run dev`) for the agent to reach it.

## Robinhood (official MCP: `agent.robinhood.com/mcp/trading`)

Checked against the live Robinhood MCP tool definitions:

| App order field | Robinhood `place_equity_order` |
|---|---|
| `id` (UUID) | `ref_id` (idempotency key, re-send on retries) |
| `side` BUY/SELL | `side` buy/sell |
| `ticker` | `symbol` |
| `qty` | `quantity` (string) |
| `orderType` limit | `type: "limit"`, `limit_price` = `limitPrice` (whole shares only) |
| `orderType` market | `type: "market"`, no limit price. Fractional, regular hours only, up to 6 decimals. The agent checks the ask against `limitPrice` first. |
| (fixed) | `time_in_force: "gfd"`, `market_hours: "regular_hours"` |
| (agent picks) | `account_number`: the single account `get_accounts` marks as agent-tradable (your **Agentic** account) |

Agent flow per order: `get_equity_tradability`, then `get_equity_quotes` (price guard), then `review_equity_order`, which simulates the order and returns pre-trade alerts such as buying power, PDT or halts. Only then `place_equity_order`. Afterwards it polls `get_equity_orders(order_id)` for fills and reads `get_equity_positions` (Agentic account) for the sync.

Things to know:
- Agents can only trade in the **Agentic** account. Your main account is read-only to them, so the thesis money has to be deposited into the Agentic account.
- Fractional shares only work as market orders in regular hours. That's why the app defaults to whole-share limit orders.
- Some names can't trade outside regular hours (e.g. AXTI); the app already uses regular hours.
- Settings → Trading agent → "Copy agent instructions" gives a ready-made prompt that follows this flow.
