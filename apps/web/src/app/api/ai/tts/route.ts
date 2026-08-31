import { NextResponse, type NextRequest } from "next/server";
import { synthesizeVoice } from "@/ai/agents/voice-generator";
import { aiDisabledResponse, aiEnabled, aiErrorResponse, extractApiKey } from "../_shared";

// Next.js requires these to be static string literals (not imported consts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/tts
 * Body: { text: string, voiceDirection?: string }
 * → binary audio/wav (24 kHz mono voiceover)
 *
 * Stage 3b: speak one scene's narration. Layered under the Veo clip on a
 * separate timeline audio track.
 */
export async function POST(request: NextRequest): Promise<Response> {
	const customKey = extractApiKey(request);
	if (!aiEnabled(customKey)) {
		return aiDisabledResponse();
	}

	let text: unknown;
	let voiceDirection: unknown;
	try {
		const body = await request.json();
		text = body?.text;
		voiceDirection = body?.voiceDirection;
	} catch {
		return NextResponse.json(
			{ error: "bad_request", message: "Body must be JSON." },
			{ status: 400 },
		);
	}

	if (typeof text !== "string" || text.trim().length === 0) {
		return NextResponse.json(
			{ error: "bad_request", message: "A non-empty 'text' is required." },
			{ status: 400 },
		);
	}

	try {
		const wav = await synthesizeVoice({
			text: text.trim(),
			voiceDirection:
				typeof voiceDirection === "string" ? voiceDirection : undefined,
			apiKey: customKey,
		});
		return new NextResponse(new Uint8Array(wav), {
			status: 200,
			headers: {
				"Content-Type": "audio/wav",
				"Content-Length": String(wav.length),
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		return aiErrorResponse(error);
	}
}
