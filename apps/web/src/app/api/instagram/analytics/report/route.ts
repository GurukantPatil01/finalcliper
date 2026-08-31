import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateText, LlmUnavailableError } from "@/analytics/llm";
import { buildReportPrompt, REPORT_SYSTEM_INSTRUCTION } from "@/analytics/report-prompt";
import type { DataPack } from "@/analytics/types";
import { analyticsDisabledResponse } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface ReportResponse {
	markdown: string;
	source: string;
}

/**
 * Turns a client-built data pack into a markdown report. The client falls
 * back to the rule-based generator when this returns 503 `llm_unavailable`.
 */
export async function POST(request: NextRequest) {
	const enabled = process.env.NEXT_PUBLIC_IG_ANALYTICS_ENABLED === "true";
	if (!enabled) return analyticsDisabledResponse();

	let pack: DataPack;
	try {
		const body = (await request.json()) as { dataPack?: DataPack };
		pack = body?.dataPack as DataPack;
	} catch {
		return NextResponse.json(
			{ error: "bad_request", message: "Body must be JSON: { dataPack }." },
			{ status: 400 },
		);
	}
	if (
		!pack ||
		typeof pack !== "object" ||
		!pack.latestDay ||
		!Array.isArray(pack.latestDay.reels) ||
		!pack.coverage
	) {
		return NextResponse.json(
			{
				error: "bad_request",
				message: "Missing or malformed dataPack — sync data before generating a report.",
			},
			{ status: 400 },
		);
	}

	try {
		const result = await generateText({
			system: REPORT_SYSTEM_INSTRUCTION,
			user: buildReportPrompt(pack),
		});
		const response: ReportResponse = { markdown: result.text, source: result.source };
		return NextResponse.json(response);
	} catch (error) {
		if (error instanceof LlmUnavailableError) {
			return NextResponse.json(
				{
					error: "llm_unavailable",
					message:
						"No LLM is configured. Set LLM_BASE_URL + LLM_API_KEY + LLM_MODEL or GEMINI_API_KEY " +
						"to enable AI-written reports; until then reports use the rule-based generator.",
				},
				{ status: 503 },
			);
		}
		const message =
			error instanceof Error ? error.message : "Unknown LLM pipeline error.";
		return NextResponse.json({ error: "llm_failed", message }, { status: 502 });
	}
}
