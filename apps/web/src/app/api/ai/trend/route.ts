import { NextResponse, type NextRequest } from "next/server";
import { analyzeTrend } from "@/ai/agents/trend-analyzer";
import { aiDisabledResponse, aiEnabled, aiErrorResponse, extractApiKey } from "../_shared";

// Next.js requires these to be static string literals (not imported consts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/trend
 * Body: { niche: string }
 * → { report: TrendReport }
 *
 * Stage 1 of the pipeline: analyze what's viral in the niche and produce the
 * brief the script/video/audio agents will consume.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const customKey = extractApiKey(request);
	if (!aiEnabled(customKey)) {
		return aiDisabledResponse();
	}

	let niche: unknown;
	let directive: any;
	try {
		const body = await request.json();
		niche = body?.niche;
		directive = body?.directive;
	} catch {
		return NextResponse.json(
			{ error: "bad_request", message: "Body must be JSON." },
			{ status: 400 },
		);
	}

	if (typeof niche !== "string" || niche.trim().length === 0) {
		return NextResponse.json(
			{ error: "bad_request", message: "A non-empty 'niche' is required." },
			{ status: 400 },
		);
	}
	if (niche.length > 200) {
		return NextResponse.json(
			{ error: "bad_request", message: "'niche' must be 200 characters or fewer." },
			{ status: 400 },
		);
	}

	try {
		const report = await analyzeTrend({
			niche: niche.trim(),
			directive,
			apiKey: customKey,
		});
		return NextResponse.json({ report });
	} catch (error) {
		return aiErrorResponse(error);
	}
}
