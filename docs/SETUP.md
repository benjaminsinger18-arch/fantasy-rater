# Setup

## Layout

```text
fantasy-rater/
├── client/   # React 18 + Vite PWA (Clerk sign-in, Tailwind, Framer Motion)
├── server/   # Express 4 + TypeScript API (Claude, Turso, Stripe, Resend, web-push)
├── mobile/   # Expo 52 app (Clerk, expo-notifications); see mobile/README.md
└── api/      # Vercel serverless adapter that re-exports the Express app
```

## Run it locally

You need Node 20 or newer.

```bash
git clone https://github.com/benjaminsinger18-arch/fantasy-rater.git
cd fantasy-rater
npm run install:all          # installs server/ and client/
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev                  # server on :3001, client on :5173 (proxies /api)
```

`npm run dev` starts both with `&`, which works in bash, zsh and Git Bash. In Windows Command Prompt or PowerShell, run `npm run dev:server` and `npm run dev:client` in two terminals.

## Environment variables

### server/.env

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | Every AI feature (Claude Sonnet) |
| `CLERK_SECRET_KEY` | Yes | Verifies the sign-in token the client sends |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Yes in production | libSQL database for prefs, saved leagues, usage limits, trade history. Leave unset to use a local SQLite file under `server/data/` |
| `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | For billing | Pro subscription checkout and the signature-verified webhook |
| `CLIENT_URL` | Yes | Stripe redirect target and CORS allow-list entry |
| `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`, `YAHOO_REDIRECT_URI` | For Yahoo leagues | Yahoo Fantasy OAuth |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | For email alerts | Weekly digest and injury emails |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` | For push | Web push; generate once with `npx web-push generate-vapid-keys` |
| `PORT` | No | Defaults to 3001 |

### client/.env

| Variable | Purpose |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk sign-in on the web client |
| `VITE_API_URL` | `/api` when client and server deploy together on Vercel; the full Railway URL otherwise |

### mobile/.env.local

See [mobile/README.md](../mobile/README.md): `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_API_URL`.

## Deploy

### Vercel (client + serverless API)

`vercel.json` builds `client/` and routes `/api/*` to `api/[...path].ts`, which imports the Express app from `server/src/index.ts` and exports it as one serverless function. Root Directory must be the repo root (the project used to live one folder down; if a Vercel project still has Root Directory set to `fantasy-rater`, clear it). Set every server variable above plus the two client variables in the Vercel dashboard.

### Railway (long-running API)

`railway.json` and `nixpacks.toml` build and start `server/` on Node 20. Cron jobs and server-sent events behave best on a long-running process, so the production API runs here and `VITE_API_URL` on Vercel points at it. Root Directory should be the repo root for the same reason as above.

### Stripe webhook

Register `POST https://<your-api>/api/billing/webhook` in the Stripe dashboard for `checkout.session.completed` and `customer.subscription.deleted`, and copy the signing secret into `STRIPE_WEBHOOK_SECRET`. The route reads the raw body so the signature can be verified.

### Yahoo OAuth

Register an app at <https://developer.yahoo.com>, set the redirect URI to `https://<your-api>/api/auth/yahoo/callback`, and copy the client id and secret.

## Scripts

```bash
npm run dev            # both (bash)            npm run build   # server tsc
cd client && npm run typecheck && npm run build
cd server && npm run typecheck && npm run build && npm start
```

CI (`.github/workflows/ci.yml`) runs typecheck and build for `server/` and `client/` on every push.
