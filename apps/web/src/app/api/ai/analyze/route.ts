import { NextResponse, type NextRequest } from "next/server";
import { runAnalysisAgent } from "@/ai/agents/analysis-agent";
import { aiDisabledResponse, aiEnabled, aiErrorResponse, extractApiKey } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/analyze
 * Body: { youtubeData?: YouTubeDataPack, instagramData?: DataPack }
 * Output: { report: AnalysisReport }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const customKey = extractApiKey(request);
	if (!aiEnabled(customKey)) {
		return aiDisabledResponse();
	}

	let body: any;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "bad_request", message: "Body must be JSON." }, { status: 400 });
	}

	const { youtubeData, instagramData } = body || {};

	if (!youtubeData && !instagramData) {
		return NextResponse.json(
			{ error: "bad_request", message: "Either youtubeData or instagramData is required." },
			{ status: 400 },
		);
	}

	try {
		const report = await runAnalysisAgent({
			youtubeData,
			instagramData,
			apiKey: customKey,
		});

		return NextResponse.json({ report });
	} catch (error) {
		return aiErrorResponse(error);
	}
}
