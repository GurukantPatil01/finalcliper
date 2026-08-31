# Decisions

This file is the ratification record for architectural and product decisions.

---

## Decisions Record

1. **Fork base:** Executed.
2. **Naming:** Set to "finalcliper".
3. **Visual differentiation:** Full pixel fidelity target.
4. **Adjust:** Basic sliders in v1; HSL and curves deferred.
5. **Store strategy:** Direct distribution.
6. **Device budget:** iPhone, iPhone 13-class, Pixel a-series, budget Android.

---

## What this means for code in this repo, concretely

- **Tokens & Styling:** Tokens are configured for accurate editor layout and metrics.
- **Distribution:** CI produces signed direct-distribution artifacts.
- **Offline First:** Zero-cost and local-first execution is enforced.

## Known, tracked exceptions to "fully functional offline"

- `apps/web/src/services/transcription/worker.ts` (on-device auto
  captions via `@huggingface/transformers`) can reach `huggingface.co`
  and `cdn.jsdelivr.net` on first use — flagged, not hidden, as a
  non-blocking warning by `scripts/offline-audit.mjs`.
- Font bundling (`apps/web/src/fonts/local-fonts.css`) currently covers
  Inter end-to-end as the proof of the local-fonts pattern.
- **Gated online AI feature ("AI Studio").** Code under `apps/web/src/ai/**`
  and `apps/web/src/app/api/ai/**` calls Google's Generative Language API
  (`generativelanguage.googleapis.com` — Veo video, Gemini TTS, Gemini text)
  to generate viral videos from a niche prompt entered in the right-hand
  chat panel. This is a deliberate, ratified exception ("online AI feature,
  gated") and is off by default. Contract:
  - **Off unless enabled.** Requires `NEXT_PUBLIC_AI_ENABLED=true` *and* a
    server-side `GEMINI_API_KEY`. A default build leaves both unset, the
    panel does not render, and no route ever calls out — still fully offline.
  - **Key is server-only.** `GEMINI_API_KEY` is read exclusively in Node
    route handlers (`@/ai/client/genai.ts`); it is never a `NEXT_PUBLIC_`
    var, so Next.js never inlines it into the browser bundle. The client
    chat UI talks only to `/api/ai/*` and imports agents as `import type`.
  - **Enforced by the audit.** `scripts/offline-audit.mjs` flags the Google
    host as a non-blocking WARNING in source and the built *server* bundle,
    and HARD-FAILS the build if it ever appears in the *client* bundle
    (which would mean the key/SDK leaked to the browser). Fix the leak, not
    the list.
- **Gated online Instagram feature (Analytics & Publishing).** Code under
  `apps/web/src/analytics/**`, `apps/web/src/services/instagram/**`, and `apps/web/src/app/api/instagram/**`
  calls the Instagram API with Instagram Login (`graph.instagram.com`,
  `api.instagram.com`, `www.instagram.com` OAuth dialog) from
  SERVER-side route handlers only. This unified connection powers both
  Instagram Reels analytics and direct Reel publishing. This is a deliberate,
  ratified exception ("online Instagram feature, gated") and is off by default. Contract:
  - **Off unless enabled.** Requires `NEXT_PUBLIC_IG_ANALYTICS_ENABLED=true`
    *and* server-side `IG_APP_ID`/`IG_APP_SECRET`. A default build leaves
    them unset: the analytics section and direct publishing stay off and no
    route ever calls out — still fully offline.
  - **Secrets are server-only.** `IG_APP_SECRET`, `GEMINI_API_KEY` and the
    optional `LLM_API_KEY` are read exclusively in Node route handlers and
    are never `NEXT_PUBLIC_` vars. The user's own Instagram connection is
    persisted locally in browser storage (localStorage), picked up from the
    one-time httpOnly OAuth handoff cookie; analytics snapshots/reports persist
    in IndexedDB. The OAuth authorize URL is built server-side and delivered
    via a 302 redirect, so no Instagram host string appears in the client bundle.
  - **Enforced by the audit.** `scripts/offline-audit.mjs` treats
    `instagram.com` and `graph.facebook.com` as gated hosts: non-blocking
    WARNING in source and the built *server* bundle, HARD-FAIL if either
    reaches the *client* bundle. Fix the leak, not the list.

