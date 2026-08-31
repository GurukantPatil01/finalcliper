import { NextResponse, type NextRequest } from "next/server";
import { aiDisabledResponse, aiEnabled, aiErrorResponse, extractApiKey } from "../_shared";
import { getGenAI } from "@/ai/client/genai";
import { MODELS } from "@/ai/client/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface TimelineContext {
	durationSeconds: number;
	currentTimeSeconds: number;
	elementCount: number;
	selectedCount: number;
}

export type CopilotAction =
	| { type: "cut_at_playhead" }
	| { type: "cut_at_time"; timeSeconds: number }
	| { type: "cut_interval"; intervalSeconds: number }
	| { type: "split_left" }
	| { type: "split_right" }
	| { type: "delete_selected" }
	| { type: "seek"; timeSeconds: number }
	| { type: "toggle_playback" }
	| { type: "analyze_and_produce" }
	| { type: "booming_radar" }
	| { type: "generate_script"; topic: string };

const SYSTEM_PROMPT = `You are Finalcliper AI Copilot, an expert video editing and creation assistant embedded directly inside a professional video editor.

You can both talk to the user (answering video editing, pacing, formatting questions) AND execute timeline actions.

When the user asks to perform an edit or create content, decide if an action should be triggered.
Output your response as STRICT JSON with this exact shape:
{
  "message": "Friendly explanation or response to the user in markdown",
  "action": null | { "type": "cut_at_playhead" } | { "type": "cut_at_time", "timeSeconds": number } | { "type": "cut_interval", "intervalSeconds": number } | { "type": "split_left" } | { "type": "split_right" } | { "type": "delete_selected" } | { "type": "seek", "timeSeconds": number } | { "type": "toggle_playback" } | { "type": "generate_script", "topic": "string" }
}

Action types guide:
- "cut_at_playhead": Split/cut video at the current playhead position (commands like "cut here", "split", "cut video", "slice").
- "cut_at_time": Split video at a specific second (commands like "cut at 5s", "split at 12.5 seconds").
- "cut_interval": Split video periodically across the timeline (commands like "cut every 3 seconds", "rhythm cuts every 2s").
- "split_left": Split and delete the left side of the current clip (commands like "trim left", "split left").
- "split_right": Split and delete the right side of the current clip (commands like "trim right", "split right").
- "delete_selected": Remove selected elements or active clip (commands like "delete clip", "remove selected").
- "seek": Move playhead to a time (commands like "go to 10s", "jump to start (0s)", "seek to end").
- "toggle_playback": Play or pause video playback.
- "generate_script": When user explicitly asks for a new video script, viral reel ideas, or topic brief (commands like "create a video about crypto", "write a script on travel hacks").

If the user is asking a general question or just chatting, set "action": null and give a helpful, concise answer in "message".`;

export async function POST(request: NextRequest): Promise<NextResponse> {
	const customKey = extractApiKey(request);
	if (!aiEnabled(customKey)) {
		return aiDisabledResponse();
	}

	let prompt = "";
	let timelineContext: TimelineContext | undefined;

	try {
		const body = await request.json();
		prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
		timelineContext = body?.timelineContext;
	} catch {
		return NextResponse.json({ error: "bad_request", message: "Body must be JSON." }, { status: 400 });
	}

	if (!prompt) {
		return NextResponse.json({ error: "bad_request", message: "Prompt is required." }, { status: 400 });
	}

	try {
		const ai = getGenAI(customKey);
		const contextInfo = timelineContext
			? `\nTimeline Context: Playhead is at ${timelineContext.currentTimeSeconds.toFixed(1)}s, total duration is ${timelineContext.durationSeconds.toFixed(1)}s, total clips on timeline: ${timelineContext.elementCount}, selected clips: ${timelineContext.selectedCount}.`
			: "";

		const response = await ai.models.generateContent({
			model: MODELS.text,
			contents: [
				{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}${contextInfo}\n\nUser request: "${prompt}"` }] },
			],
			config: {
				responseMimeType: "application/json",
				temperature: 0.3,
			},
		});

		const text = response.text?.trim() || "{}";
		let parsed: { message?: string; action?: CopilotAction | null };
		try {
			parsed = JSON.parse(text);
		} catch {
			parsed = { message: text, action: null };
		}

		return NextResponse.json({
			message: parsed.message || "Action processed.",
			action: parsed.action || null,
		});
	} catch (error) {
		return aiErrorResponse(error);
	}
}
