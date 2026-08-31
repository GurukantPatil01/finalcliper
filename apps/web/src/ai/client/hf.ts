/**
 * Server-only config + secret access for the Hugging Face Inference Providers
 * fallback, used when Veo video generation fails (see hf-visual-generator.ts).
 *
 * SECURITY CONTRACT (mirrors genai.ts; see docs/DECISIONS.md, "Gated online AI
 * feature"):
 *   - HF_TOKEN lives ONLY in the server process. It is never a NEXT_PUBLIC_
 *     var, so Next.js never inlines it into the browser bundle.
 *   - Nothing under `@/ai/client` or `@/ai/agents` may be imported by a client
 *     component. The chat UI talks to the server exclusively over `/api/ai/*`.
 *   - `scripts/offline-audit.mjs` treats `router.huggingface.co` like the
 *     Gemini host: a WARNING in source / the server bundle, a HARD FAILURE if
 *     it ever shows up in the CLIENT bundle (that would mean the token leaked).
 *
 * The runtime `typeof window` guard below mirrors genai.ts: if this module is
 * ever pulled into client code, it throws loudly instead of leaking the token.
 */

/** Thrown when the HF fallback is invoked but no token is configured. */
export class HfConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "HfConfigError";
	}
}

/** Base URL for the HF Inference Providers router. Overridable for testing. */
export const HF_ROUTER_BASE = (
	process.env.HF_ROUTER_BASE || "https://router.huggingface.co"
).replace(/\/+$/, "");

/**
 * True when an HF token is present. The Veo fallback is *optional*: when this
 * is false the route simply skips HF and surfaces the original Veo error, so a
 * missing token is a silent no-op, never a user-facing failure.
 */
export function isHuggingFaceConfigured(): boolean {
	return Boolean(process.env.HF_TOKEN);
}

/**
 * Returns the HF access token.
 * @throws {HfConfigError} on the client, or if HF_TOKEN is unset. Callers must
 * gate on isHuggingFaceConfigured() first (the video route does).
 */
export function getHfToken(): string {
	if (typeof window !== "undefined") {
		throw new HfConfigError(
			"getHfToken() is server-only and must never run in the browser.",
		);
	}
	const token = process.env.HF_TOKEN;
	if (!token) {
		throw new HfConfigError(
			"HF_TOKEN is not set — the Hugging Face video/image fallback is disabled.",
		);
	}
	return token;
}

/**
 * Text-to-image model served by the free `hf-inference` provider. SD3-medium is
 * what HF lists for hf-inference text-to-image, and it's cheap enough to fit
 * inside the free monthly credit. Override with HF_IMAGE_MODEL.
 */
export function hfImageModel(): string {
	return (
		process.env.HF_IMAGE_MODEL ||
		"stabilityai/stable-diffusion-3-medium-diffusers"
	);
}

/**
 * Optional text-to-video model. There is NO free HF text-to-video path — video
 * routes through paid providers billed via HF credits (a free account's ~$0.10
 * monthly credit won't cover a clip), so this defaults to empty and the
 * fallback goes straight to a still image. Set HF_VIDEO_MODEL (and have credits
 * / a provider that serves it via hf-inference) to attempt video first.
 */
export function hfVideoModel(): string {
	return process.env.HF_VIDEO_MODEL?.trim() || "";
}
