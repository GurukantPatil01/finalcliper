/**
 * Agent 1 — Script writer.
 *
 * Consumes the trend analyzer's brief and produces a concrete, shootable shot
 * list: an ordered set of scenes, each with a self-contained Veo visual prompt
 * and the exact voiceover line to speak over it. This is the hand-off the video
 * agent (Veo) and the audio agent (Gemini TTS) execute scene-by-scene.
 *
 * Every scene is written to fit a single ~8-second Veo clip, so the video agent
 * can generate them independently and the timeline stitches them in order.
 */
import { getGenAI } from "../client/genai";
import { MODELS } from "../client/models";
import { parseModelJson } from "../client/json";
import type { TrendReport, VideoScript } from "./types";

const SYSTEM_INSTRUCTION = `You are an elite short-form video scriptwriter. You turn a strategy brief into a precise, shootable shot list for an AI video generator (Veo) and an AI voiceover (TTS).

Rules:
- Write for vertical short-form (TikTok / Reels / Shorts). Hook in the first 2 seconds.
- Break the video into SCENES. Each scene is exactly ONE ~8-second shot — never longer, because each maps to a single AI-generated clip.
- Each scene's "visualPrompt" must be fully self-contained and richly cinematic: subject, action, setting, camera move, lens, lighting, and style. Do NOT reference other scenes ("same as before"); restate everything, because each clip is generated in isolation.
- Each scene's "voiceover" is the EXACT words spoken over that shot — punchy, conversational, no stage directions. Keep it to what a narrator can say in the scene's duration (~2.5 words/second). A scene may have an empty voiceover if it's a pure visual beat.
- Keep total duration close to the brief's recommended length. Prefer 3–5 scenes.
- "onScreenText" is an optional short caption (a few words) for that scene, or omit it.

Respond with ONLY a JSON object — no prose, no markdown fences.`;

function buildPrompt(report: TrendReport): string {
	return `Turn this brief into a shot list.

BRIEF:
- Niche: ${report.niche}
- What's winning: ${report.summary}
- Aspect ratio: ${report.aspectRatio}
- Target total duration: ~${report.recommendedDurationSeconds}s
- Strongest hooks (pick/adapt one for scene 1): ${JSON.stringify(report.hooks ?? [])}
- Content formats: ${JSON.stringify(report.contentFormats ?? [])}
- Visual style: ${report.visualStyle}
- Audio/voice style: ${report.audioStyle}
- Pacing: ${report.pacing}
- Tone keywords: ${JSON.stringify(report.toneKeywords ?? [])}
- Required structure: ${report.scriptBrief?.structure ?? "hook → value → payoff → CTA"}
- Narrator voice: ${report.scriptBrief?.voice ?? "confident, second-person"}
- Call to action: ${report.scriptBrief?.callToAction ?? ""}

Return a JSON object with EXACTLY these fields:
{
  "title": string,                     // working title for the video
  "hook": string,                      // the spoken hook line (first ~2s)
  "aspectRatio": "${report.aspectRatio}",
  "voiceDirection": string,            // global TTS direction, from the audio style
  "estimatedDurationSeconds": number,  // sum of scene durations
  "callToAction": string,              // closing CTA
  "scenes": [                          // 3-5 scenes, in order
    {
      "index": number,                 // 1-based
      "visualPrompt": string,          // self-contained cinematic Veo prompt
      "voiceover": string,             // exact narration for this scene (may be "")
      "onScreenText": string,          // optional short caption (omit if none)
      "durationSeconds": number        // <= 8
    }
  ]
}`;
}

export async function writeScript({
	report,
	apiKey,
}: {
	report: TrendReport;
	apiKey?: string;
}): Promise<VideoScript> {
	const ai = getGenAI(apiKey);

	const response = await ai.models.generateContent({
		model: MODELS.text,
		contents: buildPrompt(report),
		config: {
			systemInstruction: SYSTEM_INSTRUCTION,
			responseMimeType: "application/json",
			temperature: 0.9,
		},
	});

	const script = parseModelJson<VideoScript>(response.text);

	// Normalize: trust our aspect ratio, clamp scene durations to Veo's ceiling,
	// and re-number scenes so downstream indexing is always 1..n contiguous.
	script.aspectRatio = report.aspectRatio;
	script.scenes = (script.scenes ?? []).map((scene, i) => ({
		...scene,
		index: i + 1,
		durationSeconds: Math.min(Math.max(scene.durationSeconds || 8, 1), 8),
	}));
	script.estimatedDurationSeconds = script.scenes.reduce(
		(total, scene) => total + scene.durationSeconds,
		0,
	);
	return script;
}
