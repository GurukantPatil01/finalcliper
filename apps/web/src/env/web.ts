import { z } from "zod";

// Finalcliper: db/auth/CMS/analytics/sound-search env vars were removed along
// with the network features that used them (no Postgres, no better-auth,
// no Marble CMS, no Freesound proxy, no Upstash/Databuddy). This app must
// build and run fully offline with zero required secrets.
//
// The two, deliberately-gated exceptions are the AI Studio feature and the
// Instagram analytics feature (see docs/DECISIONS.md, "Known, tracked
// exceptions"). All of their env vars are OPTIONAL — an offline build leaves
// them unset and the features stay off:
//   - GEMINI_API_KEY            server-only secret; read only in `@/ai/client`
//                               route handlers. NEVER a NEXT_PUBLIC_ var, so
//                               it is never inlined into the browser bundle.
//   - NEXT_PUBLIC_AI_ENABLED    "true" makes the AI Studio panel render.
//   - NEXT_PUBLIC_IG_ANALYTICS_ENABLED  "true" makes the analytics section
//                               render (see `@/analytics` + its API routes).
//   - IG_APP_ID / IG_APP_SECRET server-only Meta app credentials for the
//                               Instagram OAuth + insights flow.
//   - IG_REDIRECT_URI           optional override of the OAuth redirect URI
//                               (defaults to SITE_URL + /api/instagram/analytics/callback).
//   - LLM_BASE_URL / LLM_API_KEY / LLM_MODEL  optional OpenAI-compatible
//                               endpoint for analytics reports; falls back to
//                               GEMINI_API_KEY, then to a rule-based report.
const webEnvSchema = z.object({
	// Node
	NODE_ENV: z.enum(["development", "production", "test"]),
	ANALYZE: z.string().optional(),
	NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),

	// Public
	NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),

	// Gated AI feature (optional — see note above)
	GEMINI_API_KEY: z.string().optional(),
	NEXT_PUBLIC_AI_ENABLED: z.string().optional(),

	// Gated Instagram analytics feature (optional — see note above)
	NEXT_PUBLIC_IG_ANALYTICS_ENABLED: z.string().optional(),
	IG_APP_ID: z.string().optional(),
	IG_APP_SECRET: z.string().optional(),
	IG_REDIRECT_URI: z.string().optional(),
	LLM_BASE_URL: z.string().optional(),
	LLM_API_KEY: z.string().optional(),
	LLM_MODEL: z.string().optional(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export const webEnv = webEnvSchema.parse(process.env);
