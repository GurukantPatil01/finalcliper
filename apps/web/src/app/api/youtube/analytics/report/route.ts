import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateText, isLlmConfigured } from "@/analytics/llm";
import {
	buildYouTubeReportUserPrompt,
	YOUTUBE_SYSTEM_PROMPT,
} from "@/analytics/youtube-report-prompt";
import { generateYouTubeRuleBasedReport } from "@/analytics/youtube-rule-based-report";
import type { YouTubeDataPack } from "@/analytics/youtube-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
	let dataPack: YouTubeDataPack;
	try {
		const body = await request.json();
		dataPack = body?.dataPack;
	} catch {
		return NextResponse.json(
			{ error: "bad_request", message: "Body must be JSON containing 'dataPack'." },
			{ status: 400 },
		);
	}

	if (!dataPack || !dataPack.latestDay) {
		return NextResponse.json(
			{ error: "bad_request", message: "A valid YouTube dataPack is required." },
			{ status: 400 },
		);
	}

	// If LLM is configured (Gemini / OpenAI), generate AI report
	if (isLlmConfigured()) {
		try {
			const result = await generateText({
				system: YOUTUBE_SYSTEM_PROMPT,
				user: buildYouTubeReportUserPrompt(dataPack),
			});
			return NextResponse.json({
				markdown: result.text,
				source: result.source,
			});
		} catch (error) {
			console.warn("LLM report generation failed, falling back to rule-based:", error);
		}
	}

	// Fall back to offline rule-based report
	const ruleReport = generateYouTubeRuleBasedReport(dataPack);
	return NextResponse.json({
		markdown: ruleReport,
		source: "rule-based",
	});
}
