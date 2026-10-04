# Going live: step by step

Starting book: **$15,000** in your Robinhood **Agentic** account. Every order needs your approval. The agent only executes what you approved, and only if the price checks pass.

You need: a computer that is on during market hours, Node 18+ (`node -v`), git, Claude Code, an Anthropic API key, and your Robinhood account with the Agentic account enabled.

---

## Part 1: One-time setup (about 30 minutes)

### 1. Get the code
```bash
git clone https://github.com/aahelicopter/wireframe.git
cd wireframe
git checkout claude/ai-thesis-portfolio-app-9uv7jf
cd ai-thesis
npm install
```

### 2. Add your SEC contact (for free SEC filing feeds)
Create `ai-thesis/.env.local`:
```
SEC_USER_AGENT="Your Name you@yourdomain.com"
```

### 3. Start the app
```bash
npm run dev
```
Open **http://127.0.0.1:5174**. Leave this terminal running whenever you want reviews or trading. The app and its agent API only exist while it runs.

### 4. Configure the app
1. **Settings**
   - Paste your **Anthropic API key**. Keep the model on Opus 5.5, or pick Sonnet 5.5 for about half the cost.
   - **Trading agent** card: it should say *local API online*. Leave the defaults: fractional shares on, quote age 15 min, price move 3%, $1,500 per order and $3,000 per day suggested.
2. **Header:** Capital = **15000**.
3. **Thesis map:** go through the branches. Set conviction to 0 on anything you don't want to own, and raise it where you have the strongest view.
4. **Plan & buys:** adjust the factor weights, then click **Run**. Read the suggested names and the reasons. This is your portfolio, so change it until you agree with it.
5. **Settings → Export JSON** to save a backup of your thesis.

### 5. Fund the Agentic account
In the Robinhood app, transfer **$15,000** into the account named **Agentic**, and wait until it shows as buying power. If Robinhood offers limits for agent trading on that account, set them too. They're a second safety net that doesn't depend on this app.

### 6. Connect Claude Code to Robinhood
Open a **second terminal**:
```bash
cd wireframe/ai-thesis
claude mcp add --transport http robinhood https://agent.robinhood.com/mcp/trading
claude
```
Inside Claude Code, run `/mcp`, choose **robinhood**, and complete the Robinhood sign-in. Then check the connection:

> list my Robinhood accounts and which one you can trade

You should see your main account (read-only) and **Agentic** (tradable).

Always start Claude Code **from the `ai-thesis` folder**. That loads two project files:
- `.claude/settings.json`:
  - Robinhood **read-only tools and the order simulation run without asking**.
  - **Placing or cancelling a stock order always asks you first.**
  - Options and crypto orders are **blocked**.
- `.claude/commands/trade.md`: the `/trade` command that runs the agent.

---

## Part 2: First live day (during market hours, ideally after 10:00 ET)

1. **App → Today → Run review.** It refreshes prices, pulls news, has Claude score the headlines, re-plans and proposes orders.
2. Check the proposals. For the first run, **approve just 1–2 small orders**: tick them, optionally lower the qty, then click **Approve**.
3. In the Claude Code terminal, type **`/trade`**. The agent will:
   - read the approved orders,
   - check tradability and quotes,
   - run the app's **precheck** (it refuses stale or moved prices),
   - simulate the order with Robinhood.

   It then **asks you before placing each order**. Read the details and approve.
4. Watch **Today → Execution**: each order moves *approved → sent → filled*. Confirm it in the Robinhood app too.
5. Run `/trade` again after a few minutes to record fills. The agent also reports your Agentic positions. When the app shows **"Your agent reported N broker positions"**, click **Use broker positions**.

If anything looks off, click the red **Kill switch** in the app header. You can also tell the agent to halt, or create the file `ai-thesis/.data/HALT`.

---

## Part 3: Daily routine (about 5 minutes)

| When | You | What happens |
|---|---|---|
| Morning, before or after the open | Open the app | If a review is due, it runs automatically. A brief shows on the Today tab. |
| | Skim **News signals** and **Thesis changes suggested by the news** | Accept or dismiss each suggestion. Accepting changes the thesis; then hit **Run**. |
| | Approve or reject the proposed orders | Proposals stay within the suggested daily buy amount. |
| During market hours | Run `/trade` in Claude Code (from `ai-thesis`) | Places the approved orders; you confirm each one. |
| Later the same day | Run `/trade` again | Records fills and syncs positions. |

You can set the review to every other day or weekly on the Today tab. Approved orders expire at the end of the next day if not placed.

---

## Part 4: Before scaling past $15k

Run at least 2–4 weeks first. Then check:
- Fills land close to the proposed prices (compare fill vs. limit/guard on the Today tab).
- No unexplained failed orders in the agent log.
- The news signals and thesis suggestions have been sensible.
- The AI cost in **Settings → AI research** matches what you expected.

Then raise **Capital**, and the **suggested max per order and per day**, in steps.

---

## Emergency stops (fastest first)

1. App header → **Kill switch**.
2. `touch ai-thesis/.data/HALT` (works even if the app's UI is broken).
3. Robinhood app → cancel open orders in the Agentic account.
4. Stop the `npm run dev` terminal. The agent can't get any orders without it.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "No live prices" / news feeds unreachable | The app must run via `npm run dev` (it proxies Yahoo, Google News and the SEC). Check your internet connection. |
| Agent API offline | `npm run dev` isn't running, or the agent isn't on the same computer. The API only listens on 127.0.0.1. |
| Precheck refused: "market is closed" | Only run `/trade` 9:30–16:00 ET on trading days. |
| Precheck refused: quote too old / price moved | Working as intended. Re-run the review for fresh proposals, or skip that name today. |
| "No passing precheck in the last 3 minutes" | The agent waited too long between the check and placing the order. Run `/trade` again. |
| Review proposes nothing | Kill switch is on, prices are stale (refresh), or you're over today's suggested budget. |
| Robinhood review shows a buying-power alert | The Agentic account isn't funded or the funds haven't settled yet. |
