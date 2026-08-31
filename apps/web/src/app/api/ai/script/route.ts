import { NextResponse, type NextRequest } from "next/server";
import { writeScript } from "@/ai/agents/script-writer";
import type { TrendReport } from "@/ai/agents/types";
import { aiDisabledResponse, aiEnabled, aiErrorResponse, extractApiKey } from "../_shared";

// Next.js requires these to be static string literals (not imported consts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/script
 * Body: { report: TrendReport }
 * → { script: VideoScript }
 *
 * Stage 2: turn the trend brief into a scene-by-scene shot list the video and
 * audio agents execute.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const customKey = extractApiKey(request);
	if (!aiEnabled(customKey)) {
		return aiDisabledResponse();
	}

	let report: TrendReport | undefined;
	try {
		const body = await request.json();
		report = body?.report;
	} catch {
		return NextResponse.json(
			{ error: "bad_request", message: "Body must be JSON." },
			{ status: 400 },
		);
	}

	// Minimal shape check — the field the script writer actually depends on.
	if (
		!report ||
		typeof report !== "object" ||
		typeof report.niche !== "string" ||
		typeof report.summary !== "string"
	) {
		return NextResponse.json(
			{
				error: "bad_request",
				message: "A valid 'report' (from /api/ai/trend) is required.",
			},
			{ status: 400 },
		);
	}

	try {
		const script = await writeScript({ report, apiKey: customKey });
		return NextResponse.json({ script });
	} catch (error) {
		return aiErrorResponse(error);
	}
}
