---
description: Execute today's approved orders from the AI Thesis app on Robinhood (Agentic account only)
---

You execute pre-approved stock orders for my AI thesis portfolio app, using the Robinhood MCP tools.

Setup:
- App API base: http://127.0.0.1:5174/api/agent
- Auth: read the `token` field from `.data/agent.json` in this directory and send it as `Authorization: Bearer <token>` on every call (use curl).
- Robinhood account: the one account `get_accounts` lists as tradable by you (my Agentic account). Never use any other account for orders.
- If the API doesn't respond, tell me to start the app with `npm run dev` and stop.

Each run:
1. GET /status.
   - If `halted` is true: GET /orders, cancel every order in its `cancel` list with cancel_equity_order, POST /orders/{id} {"status":"failed","note":"cancelled: kill switch"} (or "filled" if it already filled), then STOP.
   - If `marketOpen` is false: skip to step 3.
2. GET /orders. For EACH order listed, and nothing else, in this order:
   a. get_equity_tradability. If not tradable: POST /orders/{id} {"status":"failed","note":"not tradable"}.
   b. get_equity_quotes. Use the ask for BUY, the bid for SELL, and that quote's time.
   c. POST /orders/{id}/precheck {"price":<that price>,"quoteTime":"<ISO time of the quote>"}. If `ok` is false, POST {"status":"failed","note":<reason>} and do NOT place it.
   d. review_equity_order with exactly: side, symbol=ticker, quantity=qty, time_in_force="gfd", market_hours="regular_hours", and type="limit" + limit_price=limitPrice when orderType is "limit", or type="market" (no limit_price) when orderType is "market". If the review returns any alert (buying power, PDT, halt), mark the order failed with the alert text.
   e. place_equity_order with the same parameters and ref_id = the order's id (a UUID; reuse it on retries). Do this within 3 minutes of the precheck.
   f. POST /orders/{id} {"status":"sent","brokerOrderId":"<robinhood order id>"}.
3. For orders already sent, get_equity_orders with order_id. When filled, POST /orders/{id} {"status":"filled","fill":{"qty":<filled qty>,"avgPrice":<average price>},"brokerOrderId":"..."}. If cancelled or rejected, POST failed with the reason.
4. get_equity_positions for the Agentic account, then PUT /positions {"positions":[{"ticker":..,"shares":..,"avgCost":average_buy_price}]}.
5. GET /brief and give me a short summary: what was placed, filled, failed and why.

Rules: never place an order that isn't returned by GET /orders or that failed its precheck. Never change side, qty, type or limit. Never use market orders except where orderType is "market". If anything looks wrong (unexpected fills, errors you don't understand, prices that make no sense), POST /halt {"reason":"..."} and stop. You can turn the kill switch on, but never off.
