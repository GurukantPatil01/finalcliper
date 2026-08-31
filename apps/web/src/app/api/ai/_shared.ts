/**
 * Shared helpers for the `/api/ai/*` route handlers.
 *
 * All AI routes are:
 *   - runtime = "nodejs"  (the @google/genai SDK is not edge-compatible, and
 *     we read GEMINI_API_KEY from the Node process env)
 *   - gated: they 503 when no key is configured, so a missing key is a clean
 *     "feature disabled" signal rather than a 500.
 */
import { NextRequest, NextResponse } from "next/server";
import { AiConfigError, isAiConfigured } from "@/ai/client/genai";

// NOTE: each AI route must declare `export const runtime = "nodejs"` inline —
// Next.js statically analyzes that export and rejects a reference to an
// imported constant. Don't hoist it here.

/** Extracts custom Gemini API key from request headers or query if provided by client. */
export function extractApiKey(request: NextRequest): string | undefined {
	const headerKey = request.headers.get("x-gemini-api-key");
	if (headerKey?.trim()) return headerKey.trim();

	const authHeader = request.headers.get("authorization");
	if (authHeader?.startsWith("Bearer AIza")) {
		return authHeader.slice(7).trim();
	}

	return undefined;
}

/** JSON 503 when the AI feature isn't configured on this deployment or request. */
export function aiDisabledResponse(): NextResponse {
	return NextResponse.json(
		{
			error: "ai_disabled",
			message:
				"AI Studio is not configured. Set GEMINI_API_KEY in the API Keys settings " +
				"or in the server environment to enable it.",
		},
		{ status: 503 },
	);
}

/** True when the feature is usable; routes should early-return otherwise. */
export function aiEnabled(customKey?: string | null): boolean {
	return isAiConfigured(customKey);
}

/**
 * True when an upstream error is a Google quota / rate-limit (HTTP 429,
 * RESOURCE_EXHAUSTED). Veo video generation in particular is tightly capped
 * and typically needs billing enabled on the Gemini API project.
 */
function isRateLimitError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const e = error as { status?: number; code?: number; message?: string };
	if (e.status === 429 || e.code === 429) return true;
	return /RESOURCE_EXHAUSTED|\b429\b|quota|rate limit/i.test(e.message ?? "");
}

/**
 * Maps an agent error to a JSON response. Config problems → 503 (disabled),
 * quota/rate limits → 429 (retryable), everything else → 502 (upstream/model
 * failure) with a safe message.
 */
export function aiErrorResponse(error: unknown): NextResponse {
	if (error instanceof AiConfigError) {
		return aiDisabledResponse();
	}
	if (isRateLimitError(error)) {
		return NextResponse.json(
			{
				error: "ai_rate_limited",
				message:
					"Google's AI quota is exhausted. Video generation (Veo) needs " +
					"billing enabled on your Gemini API project; text/audio have " +
					"per-minute free limits. Wait for the quota to reset or enable " +
					"billing, then try again.",
			},
			{ status: 429 },
		);
	}
	const message =
		error instanceof Error ? error.message : "Unknown AI pipeline error.";
	// Never leak stack traces or key material; message is agent-authored text.
	return NextResponse.json(
		{ error: "ai_failed", message },
		{ status: 502 },
	);
}
