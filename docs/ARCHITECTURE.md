# Architecture

## Request path

1. The React client (`client/src/App.tsx`) lazy-loads one component per route and attaches the Clerk session token to every request through an axios instance (`client/src/lib/api.ts`, base URL `VITE_API_URL`, default `/api`).
2. Express (`server/src/index.ts`) applies `helmet`, a CORS allow-list (`CLIENT_URL`, the Vercel domain and raterzone.xyz), a global rate limit, a stricter limit on the player-photo proxy, and a 1 MB JSON body limit. The Stripe webhook route is mounted before the JSON parser so it receives the raw body.
3. Each feature router guards itself with `requireAuth(tier)` (verifies the Clerk token and loads the user's plan) and `checkUsage(feature, dailyFreeLimit)` (returns HTTP 402 when a free user is over their daily count; Pro users are unlimited).
4. Scoring logic runs in pure services. Claude is called only for the written analysis, and that text is streamed.

## Routers (`server/src/routes/`)

| Route | What it does |
| --- | --- |
| `/api/trade` | Rates a proposed trade: `services/rater.ts` scores each side (rank, recent points, injury penalty), computes a fairness ratio and a verdict from Great Deal to Horrible Deal, then queues a Claude analysis |
| `/api/team` | Grades a whole roster by position group |
| `/api/startsit` | Compares two or more players for a given week |
| `/api/waiver` | Ranks free agents for a league |
| `/api/draft` | Live draft assistant: best available by need |
| `/api/lineup` | `services/lineupOptimizer.ts` fills roster slots to maximize projected points |
| `/api/matchup` | Head-to-head analysis for the current week |
| `/api/players` | Rankings, search, and a cached photo proxy |
| `/api/league`, `/api/leagues` | Import and save leagues from Sleeper, ESPN, Yahoo, FPL and IPL (`services/platforms/`) |
| `/api/analyze` | Server-sent events stream of Claude's text for a previously queued prompt |
| `/api/chat` | Free-form fantasy chat with league context |
| `/api/live` | Live scoring for the user's matchup |
| `/api/auth` | Yahoo OAuth start and callback |
| `/api/billing` | Stripe checkout session, portal, and the signature-verified webhook |
| `/api/notifications` | Push subscriptions, email preferences, injury-alert settings |
| `/api/health` | Liveness |

## Streaming

A rating endpoint builds the prompt (`services/claude.ts`, which sanitizes user-supplied names to block prompt injection), hashes it with SHA-256, stores it, and returns the hash. The client then opens `GET /api/analyze/stream?hash=...`. The server sets `Content-Type: text/event-stream`, forwards each Claude token as `data: {"text": "..."}`, ends with `data: [DONE]`, and saves the finished text to `trade_history`. The UI renders tokens as they arrive.

## Simulation

`services/playoffSimulator.ts` runs 500 seasons of the remaining schedule. Each game draws both scores from a Gaussian around the team's average with 22 percent standard deviation, tallies wins, and reports playoff odds and projected seeds.

## Data

Turso (libSQL) in production, a local SQLite file in development. Tables: `user_prefs`, `saved_leagues`, `saved_rosters`, `push_subscriptions`, `injury_alerts_sent`, `trade_history`, `usage_limits`.

## Background jobs (`services/cron.ts`)

- Every 15 minutes: `checkInjuryAlerts` compares saved rosters against current injury reports and sends push or email once per player (`injury_alerts_sent`).
- Mondays at 09:00: `sendWeeklyDigests` emails each opted-in user a summary through Resend.

## Platforms (`services/platforms/`)

Sleeper (`api.sleeper.app/v1`), ESPN (`lm-api-reads.fantasy.espn.com`), Yahoo (`fantasysports.yahooapis.com`, OAuth), Fantasy Premier League (`fantasy.premierleague.com/api`) and IPL cricket. Each client maps its league, roster and player shapes into the shared `Player` and `League` types so every feature works the same regardless of source.

## Deployment shape

- Vercel serves `client/dist` and routes `/api/*` to `api/[...path].ts`, a one-line adapter that exports the Express app as a serverless function.
- Railway runs the same server as a long-lived process for cron and SSE (`railway.json`, `nixpacks.toml`).
- The Expo app in `mobile/` calls the Railway URL directly.
