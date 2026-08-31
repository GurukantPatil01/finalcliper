# Instagram Reels Analytics — Setup Guide

The `/analytics` section is a **gated online feature** (see
`docs/DECISIONS.md`): off by default, secrets server-side only, no network
calls unless you enable and connect it. It shows Instagram Reels
performance, daily snapshots, and a generated morning report ("the agent").

One-time setup takes ~10 minutes.

## 1. Convert your Instagram account to Creator or Business

Per-reel insights are only available on Creator/Business accounts.

1. In the Instagram app: **Settings and activity → Account type and tools →
   Switch to professional account**.
2. Pick **Creator** (or Business) and complete the prompts.

Converting back to a personal account later removes access to insights.

## 2. Create a Meta app

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
   and click **Create app** (type: Business, or "Other" → Business).
2. In the app dashboard, add the **Instagram** product.
3. In **App settings → Basic**, copy the **App ID** and **App secret**.
4. Under **Instagram → API setup with Instagram login**, add the OAuth
   redirect URI:
   ```
   http://localhost:3000/api/instagram/oauth/callback
   ```
   (Note: `http://localhost:3000/api/instagram/analytics/callback` is also supported for backwards compatibility. If you also use Instagram Login for other flows, that screen manages
   "Deauthorize"/"Data deletion" URLs too — they can be left blank for local
   use.)
5. While your app is in **Development mode**, you can connect your own
   account (any role on the app: admin/developer/tester). For other users,
   the app needs App Review + a Business verification — not needed for a
   personal local dashboard.

## 3. Configure and run the app

Add to `apps/web/.env.local` (see `.env.example`):

```bash
NEXT_PUBLIC_IG_ANALYTICS_ENABLED=true
IG_APP_ID=your-app-id
IG_APP_SECRET=your-app-secret

# Optional — AI-written reports via any OpenAI-compatible endpoint:
# LLM_BASE_URL=https://api.example.com/v1
# LLM_API_KEY=...
# LLM_MODEL=...
# (Without LLM_*, reports use GEMINI_API_KEY if set, else a rule-based
#  generator — the feature works either way.)
```

Then:

```bash
bun install
bun run dev:web        # http://localhost:3000/analytics
```

## 4. Connect Instagram

1. Open **/analytics/settings** (or the Video Editor **Publish & Upload Video** modal) and click **Connect Instagram**.
2. Approve the permissions (basic profile, manage insights, and content publishing) in Instagram's
   consent screen.
3. You land back on the page, connected. The single connection is now active across both Analytics and Reel Publishing. Click **Sync now** to
   store the first daily snapshot.

What happens under the hood: OAuth code → short-lived token → ~60-day
long-lived token (server-side exchange) → the token is handed to the browser
via a one-time httpOnly cookie and stored in your localStorage. Syncs and Reel
publishing use this shared connection directly. The token auto-renews
whenever <7 days of validity remain — while you keep using the app, it never expires.

## Daily usage

- **Overview** — followers, 7/30-day views, engagement rate, trend charts.
  Opening it on a new day triggers a sync automatically.
- **Reels** — every tracked reel with views/likes/comments/saves/shares,
  engagement rate, and over/under-performance vs your account average.
- **Reports** — the agent's report: yesterday's numbers, what's working
  (posting time, topics, patterns), and 3–5 concrete actions. A new report
  generates itself the first time you open the page each day (toggleable),
  or via **Generate report now**.
- **Publishing** — In the video editor, click **Publish** to upload Reels
  directly to your connected Instagram account without typing tokens or IDs.
- **Settings** — connection, token expiry, sync status, auto-report toggle,
  delete data.

All analytics data (daily snapshots + reports) lives in your browser's
IndexedDB — nothing is stored on any server.

## Troubleshooting

- **"Instagram is not configured"** — `NEXT_PUBLIC_IG_ANALYTICS_ENABLED`
  / `IG_APP_ID` / `IG_APP_SECRET` missing; restart the dev server after
  editing `.env.local`.
- **OAuth error "redirect_uri mismatch"** — the redirect URI in the Meta app
  must exactly match `IG_REDIRECT_URI` (default:
  `${NEXT_PUBLIC_SITE_URL}/api/instagram/oauth/callback`).
- **Token expired (401)** — the account was disconnected too long (>60 days)
  or the token was revoked; click Reconnect. Stored history is kept.
- **Missing views/insights per reel** — insights for a reel are only exposed
  for a limited window after posting, and some metrics vary by account type;
  unavailable metrics show as "—".
- **Reports say "rule-based"** — no LLM is configured; that's the fallback,
  not an error.

## Security notes

- `IG_APP_SECRET`, `LLM_API_KEY`, and `GEMINI_API_KEY` are server-only.
  Never prefix them with `NEXT_PUBLIC_`.
- The user token is yours alone and stays in your browser (localStorage) —
  the same trust model as the existing publish tokens in the API-keys
  settings.
- `scripts/offline-audit.mjs` treats `instagram.com` and `graph.facebook.com`
  as gated hosts: server-side use is a tracked warning; any appearance in
  the client bundle fails CI.
