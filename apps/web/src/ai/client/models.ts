/**
 * Central registry of the Google Generative AI model IDs the AI Studio uses.
 *
 * Kept in one place so a single edit re-points every agent. Defaults track the
 * current Gemini lineup (Aug 2026): the whole 2.5 line is being sunset for new
 * API keys, so we default to 3.x. The commented alternatives are the newest
 * (3.7 text) or the older fallback (2.5 tts) — swap if your key differs.
 *
 * This module is server-only in spirit (imported by the agents), but holds no
 * secrets, so it is safe to import anywhere.
 */
export const MODELS = {
	/** Fast text agent: trend analysis, script writing, rating. */
	text: "gemini-3.6-flash",
	// text: "gemini-3.7-flash", // newest/most capable flash — use if enabled

	/** Long-running video generation with native audio (Veo). Phase 3. */
	video: "veo-3.1-lite-generate-preview",
	// video: "veo-3.1-generate-preview", // higher quality, slower, pricier

	/** Text-to-speech (base64 PCM out: mono, 24kHz, 16-bit). Phase 3. */
	tts: "gemini-3.1-flash-tts-preview",
	// tts: "gemini-2.5-flash-preview-tts", // older fallback (2.5 line, sunsetting)
} as const;

export type ModelKey = keyof typeof MODELS;
