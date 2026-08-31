/**
 * Agent 4 — Trend analyzer (the pipeline's entry point).
 *
 * Given a niche, it produces a structured brief describing what is currently
 * winning for AI-generated short-form video in that niche, and — critically —
 * what the downstream script/video/audio agents should therefore make. It is
 * the "sees the viral patterns, decides the script requirements" step of the
 * spec.
 *
 * Phase 1 uses Gemini's own knowledge of current viral patterns (a text
 * brief). A later phase can additionally feed real reference-video URLs for
 * multimodal grounding; the output contract (TrendReport) stays the same.
 */
import { getGenAI } from "../client/genai";
import { MODELS } from "../client/models";
import { parseModelJson } from "../client/json";
import type { TrendReport, ProductionDirective } from "./types";
import { getEvolvingMetaPrompt } from "./viral-memory";

const SYSTEM_INSTRUCTION = `You are a world-class short-form video strategist who reverse-engineers why AI-generated videos go viral on TikTok, Instagram Reels, and YouTube Shorts.

You continuously track what is booming across top creators right now — cold-open hooks, pacing, visual style, narration energy, and payoff structure — and you translate them into a concrete production brief that a script writer, a video generator (Veo), and a voiceover generator can execute directly.

Be specific and opinionated. Prefer concrete, produceable direction ("start on a 1-second extreme close-up, hard cut on the beat") over vague advice ("make it engaging"). Everything you output must be realistic to generate as an 8-second-per-shot AI video with AI voiceover.

Respond with ONLY a JSON object — no prose, no markdown fences.`;

function buildPrompt(niche: string, directive?: ProductionDirective): string {
	let prompt = `Niche: "${niche}"\n`;
	if (directive) {
		prompt += `\nChannel Performance Directive:\n`;
		prompt += `- Concept: ${directive.concept}\n`;
		prompt += `- Recommended Title: "${directive.title}"\n`;
		prompt += `- Hook Strategy: ${directive.hookStrategy}\n`;
		prompt += `- Target Duration: ${directive.targetDurationSeconds}s\n`;
		prompt += `- Visual & Pacing Style: ${directive.visualStyle} (${directive.pacing})\n`;
	}

	prompt += getEvolvingMetaPrompt();

	prompt += `\nAnalyze what is going viral RIGHT NOW in this niche across top creators, then produce the production brief.

Return a JSON object with EXACTLY these fields:
{
  "niche": string,                        // echo the niche
  "summary": string,                      // 1-2 sentences: what's winning right now
  "targetPlatform": string,               // e.g. "TikTok / Reels / Shorts"
  "aspectRatio": string,                  // "9:16" for short-form vertical
  "recommendedDurationSeconds": number,   // total video length, typically 15-40
  "hooks": string[],                      // 3-5 proven opening hooks, strongest first
  "contentFormats": string[],             // 2-4 formats that perform (e.g. "talking-head", "b-roll montage")
  "visualStyle": string,                  // direction to seed the video generator's prompts
  "audioStyle": string,                   // voice energy + music vibe for the voiceover agent
  "pacing": string,                       // editing pace, e.g. "fast cuts, 1-2s per shot"
  "toneKeywords": string[],               // 4-8 mood/word-palette keywords
  "scriptBrief": {
    "structure": string,                  // narrative shape, e.g. "hook -> 3 rapid tips -> payoff -> CTA"
    "callToAction": string,               // the CTA to close on
    "voice": string                       // narrator voice, e.g. "confident, punchy, second-person"
  },
  "insights": [                           // 3-5 ranked patterns behind the recommendations
    { "pattern": string, "why": string }
  ]
}`;
	return prompt;
}

export async function analyzeTrend({
	niche,
	directive,
	apiKey,
}: {
	niche: string;
	directive?: ProductionDirective;
	apiKey?: string;
}): Promise<TrendReport> {
	const ai = getGenAI(apiKey);

	const response = await ai.models.generateContent({
		model: MODELS.text,
		contents: buildPrompt(niche, directive),
		config: {
			systemInstruction: SYSTEM_INSTRUCTION,
			responseMimeType: "application/json",
			temperature: 0.8,
		},
	});

	const report = parseModelJson<TrendReport>(response.text);

	// The model echoes the niche, but trust our input over its transcription.
	report.niche = niche;
	return report;
}
