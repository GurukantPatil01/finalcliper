import { NextResponse, type NextRequest } from "next/server";
import { getGenAI } from "@/ai/client/genai";
import { MODELS } from "@/ai/client/models";
import { parseModelJson } from "@/ai/client/json";
import { getActiveViralPatterns } from "@/ai/agents/viral-memory";
import { aiDisabledResponse, aiEnabled, aiErrorResponse, extractApiKey } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface BoomingCreatorMeta {
	title: string;
	niche: string;
	hookTemplate: string;
	pacingStyle: string;
	whyItWorks: string;
	recommendedConcept: string;
	targetDurationSeconds: number;
}

const SYSTEM_PROMPT = `You are the Real-Time Viral Creator Radar Agent for short-form video creators (YouTube Shorts, TikTok, Instagram Reels).
Your job is to identify what is BOOMING across top creators RIGHT NOW in 2026.

Analyze recent viral creator trends, breakout editing patterns, and psychological retention hooks.
Output STRICT valid JSON with this exact structure:
{
  "trendingMetas": [
    {
      "title": string,                   // Short snappy name of the trending creator format (e.g. "Extreme Contrast Hook", "Split-Screen Micro Doc", "Loopback Mystery")
      "niche": string,                   // Niche or general category (e.g. "Tech & Productivity", "Finance Hacks", "Storytelling", "Fitness & Routine")
      "hookTemplate": string,            // The exact opening line/visual format that stops the scroll
      "pacingStyle": string,             // Editing cadence (e.g. "0.8s fast cut b-roll + bass drops")
      "whyItWorks": string,              // 1 sentence on viewer retention psychology
      "recommendedConcept": string,      // Concrete video idea ready to produce right now
      "targetDurationSeconds": number    // Optimal length (e.g. 25-40s)
    }
  ]
}`;

export async function GET(request: NextRequest): Promise<NextResponse> {
	const customKey = extractApiKey(request);
	if (!aiEnabled(customKey)) {
		return aiDisabledResponse();
	}

	try {
		const ai = getGenAI(customKey);
		const learnedPatterns = getActiveViralPatterns();

		const prompt = `Synthesize the top 5 most viral, BOOMING formats that top creators are using to get millions of views right now.
Include a mix of high-retention hook formulas, pacing trends, and content angles.

Active learned patterns from memory for context:
${learnedPatterns.map((p) => `- ${p.title}: ${p.description}`).join("\n")}

Respond with ONLY the JSON object.`;

		const response = await ai.models.generateContent({
			model: MODELS.text,
			contents: prompt,
			config: {
				systemInstruction: SYSTEM_PROMPT,
				responseMimeType: "application/json",
				temperature: 0.7,
			},
		});

		const data = parseModelJson<{ trendingMetas: BoomingCreatorMeta[] }>(response.text);
		return NextResponse.json(data);
	} catch (error) {
		return aiErrorResponse(error);
	}
}
