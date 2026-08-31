import { NextResponse, type NextRequest } from "next/server";
import { generateVideoClip } from "@/ai/agents/video-generator";
import { generateHuggingFaceVisual } from "@/ai/agents/hf-visual-generator";
import { isHuggingFaceConfigured } from "@/ai/client/hf";
import { aiDisabledResponse, aiEnabled, aiErrorResponse, extractApiKey } from "../_shared";

// Next.js requires these to be static string literals (not imported consts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Veo polling can take minutes; raise the ceiling where the platform honors it.
export const maxDuration = 300;

/**
 * POST /api/ai/video
 * Body: { visualPrompt: string, aspectRatio?: "9:16" | "16:9" }
 * → binary video/mp4 (an ~8s Veo clip), OR — when Veo fails and a Hugging Face
 *   token is configured — an HF fallback: video/mp4 (only with credits + a
 *   served video model) or a free image/* still. The client keys off the
 *   response Content-Type, so either lands on the scene's timeline slot.
 *
 * Stage 3a: generate the visual for one scene. Long-running — the client shows
 * a "this takes a minute or two" affordance.
 */
export async function POST(request: NextRequest): Promise<Response> {
	const customKey = extractApiKey(request);
	if (!aiEnabled(customKey)) {
		return aiDisabledResponse();
	}

	let visualPrompt: unknown;
	let aspectRatio: unknown;
	try {
		const body = await request.json();
		visualPrompt = body?.visualPrompt;
		aspectRatio = body?.aspectRatio;
	} catch {
		return NextResponse.json(
			{ error: "bad_request", message: "Body must be JSON." },
			{ status: 400 },
		);
	}

	if (typeof visualPrompt !== "string" || visualPrompt.trim().length === 0) {
		return NextResponse.json(
			{ error: "bad_request", message: "A non-empty 'visualPrompt' is required." },
			{ status: 400 },
		);
	}

	const ratio = typeof aspectRatio === "string" ? aspectRatio : "9:16";

	try {
		const mp4 = await generateVideoClip({
			visualPrompt: visualPrompt.trim(),
			aspectRatio: ratio,
			apiKey: customKey,
		});
		return new NextResponse(new Uint8Array(mp4), {
			status: 200,
			headers: {
				"Content-Type": "video/mp4",
				"Content-Length": String(mp4.length),
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		// Veo failed — most often a 429 quota (video needs billing enabled on the
		// Gemini project). If a Hugging Face token is configured, fall back to HF:
		// an optional video attempt (needs credits), then a free still image.
		if (isHuggingFaceConfigured()) {
			try {
				const visual = await generateHuggingFaceVisual({
					visualPrompt: visualPrompt.trim(),
					aspectRatio: ratio,
				});
				return new NextResponse(new Uint8Array(visual.bytes), {
					status: 200,
					headers: {
						"Content-Type": visual.contentType,
						"Content-Length": String(visual.bytes.length),
						"Cache-Control": "no-store",
					},
				});
			} catch (hfError) {
				// Both failed — surface the original Veo error, which carries the
				// actionable quota/billing message. Log HF's for debugging.
				console.error("Hugging Face fallback failed:", hfError);
			}
		}
		return aiErrorResponse(error);
	}
}
