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

## Robinhood notes

This app doesn't talk to Robinhood itself. Everything broker-specific lives in your agent. Check what your Robinhood connection supports, especially limit orders on fractional shares (keep **Fractional shares** off in Settings if it can't), extended hours, and non-US listings (the app already skips those).
