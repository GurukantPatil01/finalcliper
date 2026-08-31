import type { CopilotAction } from "@/app/api/ai/chat/route";

/** Local fast-path regex intent matcher (0ms latency for common editor commands) */
export function matchLocalEditorCommand(input: string): CopilotAction | null {
	const raw = input.trim().toLowerCase();

	// Split / Cut commands
	if (
		raw === "cut" ||
		raw === "split" ||
		raw === "/cut" ||
		raw === "/split" ||
		raw === "cut here" ||
		raw === "split here" ||
		raw === "slice" ||
		raw === "cut at playhead" ||
		raw === "cut video" ||
		raw === "split clip"
	) {
		return { type: "cut_at_playhead" };
	}

	// Interval cuts (e.g. "cut every 3s", "split every 2 seconds", "cut every 5 sec")
	const intervalMatch = raw.match(
		/(?:cut|split|slice)\s+(?:every|each)\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds|second)?/i,
	);
	if (intervalMatch) {
		const interval = parseFloat(intervalMatch[1]);
		if (!isNaN(interval) && interval > 0) {
			return { type: "cut_interval", intervalSeconds: interval };
		}
	}

	// MM:SS format cut (e.g. "cut at 01:25", "split at 2:30")
	const mmssMatch = raw.match(
		/(?:cut|split|slice)\s+at\s+(\d+):(\d+)(?:\.(\d+))?/i,
	);
	if (mmssMatch) {
		const mins = parseInt(mmssMatch[1], 10);
		const secs = parseInt(mmssMatch[2], 10);
		const ms = mmssMatch[3] ? parseFloat(`0.${mmssMatch[3]}`) : 0;
		return { type: "cut_at_time", timeSeconds: mins * 60 + secs + ms };
	}

	// Specific time cuts (e.g. "cut at 5s", "split at 12 seconds")
	const timeMatch = raw.match(
		/(?:cut|split|slice)\s+at\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds|second)?/i,
	);
	if (timeMatch) {
		const seconds = parseFloat(timeMatch[1]);
		if (!isNaN(seconds)) {
			return { type: "cut_at_time", timeSeconds: seconds };
		}
	}

	// Split left / right
	if (
		raw.includes("split left") ||
		raw.includes("cut left") ||
		raw.includes("trim left")
	) {
		return { type: "split_left" };
	}
	if (
		raw.includes("split right") ||
		raw.includes("cut right") ||
		raw.includes("trim right")
	) {
		return { type: "split_right" };
	}

	// Playback & Seek
	if (
		raw === "play" ||
		raw === "pause" ||
		raw === "toggle play" ||
		raw === "stop"
	) {
		return { type: "toggle_playback" };
	}
	if (
		raw === "jump to start" ||
		raw === "go to beginning" ||
		raw === "goto start" ||
		raw === "start"
	) {
		return { type: "seek", timeSeconds: 0 };
	}
	const seekMatch = raw.match(
		/(?:seek|jump|go)\s+to\s+(\d+(?:\.\d+)?)\s*(?:s|sec|seconds)?/i,
	);
	if (seekMatch) {
		const seconds = parseFloat(seekMatch[1]);
		if (!isNaN(seconds)) {
			return { type: "seek", timeSeconds: seconds };
		}
	}

	// Delete
	if (
		raw === "delete" ||
		raw === "delete selected" ||
		raw === "remove selected" ||
		raw === "remove clip"
	) {
		return { type: "delete_selected" };
	}

	// Booming Creator Radar
	if (
		raw === "booming" ||
		raw === "/booming" ||
		raw === "what's booming" ||
		raw === "whats booming" ||
		raw === "trending now" ||
		raw === "viral radar" ||
		raw === "booming trends" ||
		raw === "creator trends"
	) {
		return { type: "booming_radar" };
	}

	// Analyze & Auto-produce from analytics
	if (
		raw === "analyze" ||
		raw === "analyze channel" ||
		raw === "/analyze" ||
		raw === "auto create" ||
		raw === "analyze and create" ||
		raw === "create from analytics" ||
		raw === "produce from analytics"
	) {
		return { type: "analyze_and_produce" };
	}

	// Explicit script command (e.g. "/script tech trends", "script: finance hacks")
	if (
		raw.startsWith("/script ") ||
		raw.startsWith("script:") ||
		raw.startsWith("write script ")
	) {
		const topic = raw
			.replace(/^\/script\s+|^script:\s*|^write script\s+/i, "")
			.trim();
		if (topic) {
			return { type: "generate_script", topic };
		}
	}

	return null;
}
