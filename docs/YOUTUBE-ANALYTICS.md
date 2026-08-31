# YouTube Studio Analytics — Setup Guide

The `/analytics/youtube` section is a **gated online feature** (see `docs/DECISIONS.md`): off by default, secrets server-side only, no network calls unless you enable and connect it. It shows YouTube channel performance, watch time, audience retention, Shorts vs Long-form metrics, daily snapshots, and AI-generated growth reports.

One-time setup takes ~5 minutes.

---

## 1. Enable YouTube APIs in Google Cloud Console

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project.
3. Go to **APIs & Services → Library** and enable:
   - **YouTube Data API v3**
   - **YouTube Analytics API**

---

## 2. Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Name: `Finalcliper YouTube Analytics`.
5. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/youtube/oauth/callback
   ```
   *(If using a custom domain or ngrok tunnel, add `https://your-domain.com/api/youtube/oauth/callback`)*
6. Click **Create** and copy your **Client ID** and **Client Secret**.

---

## 3. Configure `.env.local`

Add the following to `apps/web/.env.local`:

```bash
NEXT_PUBLIC_YOUTUBE_ANALYTICS_ENABLED=true
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Optional override if using a tunnel:
# YOUTUBE_REDIRECT_URI=https://your-tunnel.ngrok-free.dev/api/youtube/oauth/callback

# Optional: AI reports via Gemini or OpenAI endpoint
GEMINI_API_KEY=your-gemini-key
```

Then run the development server:

```bash
bun run dev:web
```

---

## 4. Connect Your YouTube Channel

1. Open **[http://localhost:3000/analytics/youtube/settings](http://localhost:3000/analytics/youtube/settings)** (or click **YouTube** in the top navigation of `/analytics`).
2. Click **Connect YouTube Channel**.
3. Select your Google account and grant permissions (view YouTube statistics, analytics, and uploads).
4. You will be redirected back, connected! Click **Sync now** to store your first daily snapshot.

---

## Daily Usage

- **Overview (`/analytics/youtube`)**: Track subscriber growth, total channel views, estimated watch time in hours, and 7-day view gain trends.
- **Videos & Shorts (`/analytics/youtube/videos`)**: Full catalog table with filterable views, likes, watch time, engagement rate, and performance delta.
- **AI Reports (`/analytics/youtube/reports`)**: Daily strategic analysis analyzing retention patterns, hook quality, Shorts vs long-form ratios, and actionable 3-step growth directives.
- **Video Publisher**: In the Video Editor, click **Publish** to upload videos directly to your connected YouTube channel without manually copying tokens.

All snapshots and reports are stored locally in your browser's IndexedDB — nothing is sent to any intermediary database server.
