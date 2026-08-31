/**
 * Server-only factory for the Google GenAI client.
 *
 * SECURITY CONTRACT (see docs/DECISIONS.md, "Gated online AI feature"):
 *   - GEMINI_API_KEY lives ONLY in the server process (a route handler or
 *     server module reads it). It is never a NEXT_PUBLIC_ var, so Next.js
 *     never inlines it into the browser bundle.
 *   - Nothing under `@/ai/client` or `@/ai/agents` may be imported by a
 *     client component. The chat UI talks to the server exclusively over
 *     `/api/ai/*` and imports only `import type` from the agents.
 *   - `scripts/offline-audit.mjs` HARD-FAILS if the Google host ever shows up
 *     in the built CLIENT bundle — that would mean this contract was broken.
 *
 * The runtime `typeof window` guard below is a belt-and-suspenders check: if
 * this module is ever accidentally pulled into client code, it throws loudly
 * instead of silently trying (and failing) to read the key in the browser.
 */
import { GoogleGenAI } from "@google/genai";

/** Thrown when the AI feature is invoked but no key is configured. */
export class AiConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AiConfigError";
	}
}

let cached: GoogleGenAI | null = null;

/** True when a Gemini API key is present in the server environment or passed via request. */
export function isAiConfigured(customKey?: string | null): boolean {
	return Boolean(customKey || process.env.GEMINI_API_KEY);
}

/**
 * Returns a GoogleGenAI client using the provided key or falling back to GEMINI_API_KEY.
 * @throws {AiConfigError} if called on the client, or if no key is configured.
 */
export function getGenAI(customKey?: string | null): GoogleGenAI {
	if (typeof window !== "undefined") {
		throw new AiConfigError(
			"getGenAI() is server-only and must never run in the browser.",
		);
	}
	const apiKey = customKey || process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new AiConfigError(
			"GEMINI_API_KEY is not set — the AI feature is disabled. " +
				"Set it in the API Keys settings or in .env.local to enable AI Studio.",
		);
	}
	if (customKey) {
		return new GoogleGenAI({ apiKey: customKey });
	}
	if (!cached) {
		cached = new GoogleGenAI({ apiKey });
	}
	return cached;
}
