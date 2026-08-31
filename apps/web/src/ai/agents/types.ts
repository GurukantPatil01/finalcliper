/**
 * Shared contracts for the AI Studio agent pipeline.
 *
 * Flow (per the product spec):
 *   Trend analyzer → (decides script requirements) → Script writer →
 *   Video agent + Audio agent → Rater.
 *
 * These types are the hand-off shape between stages. They contain NO secrets
 * and NO server-only imports, so both the server agents and the client chat
 * UI may `import type` from here (type-only imports are erased at build time).
 */

/** A single observed pattern the trend analyzer surfaces, with its rationale. */
export interface TrendInsight {
	/** The concrete pattern, e.g. "3-second pattern-interrupt cold open". */
	pattern: string;
	/** Why it works for this niche right now. */
	why: string;
}

/**
 * The trend analyzer's output. This is the brief every downstream agent reads:
 * the script writer turns it into a script, the video agent into Veo prompts,
 * the audio agent into a voiceover/music direction.
 */
export interface TrendReport {
	/** Echo of the requested niche. */
	niche: string;
	/** 1–2 sentences on what is winning in this niche right now. */
	summary: string;
	/** Where these videos live — drives aspect ratio & pacing. */
	targetPlatform: string;
	/** "9:16" | "16:9" | "1:1" — vertical is the default for short-form. */
	aspectRatio: string;
	/** Recommended total runtime for a single video, in seconds. */
	recommendedDurationSeconds: number;
	/** Proven opening hooks, most effective first. */
	hooks: string[];
	/** Content formats that perform, e.g. "talking-head", "b-roll montage". */
	contentFormats: string[];
	/** Visual direction that will seed the video agent's prompts. */
	visualStyle: string;
	/** Audio direction (voice energy, music vibe) for the audio agent. */
	audioStyle: string;
	/** Editing pace, e.g. "fast cuts, 1–2s per shot, hard transitions". */
	pacing: string;
	/** Mood/word palette that keeps every stage on-brand. */
	toneKeywords: string[];
	/** What the script writer must produce. */
	scriptBrief: {
		/** Narrative shape, e.g. "hook → 3 rapid tips → payoff → CTA". */
		structure: string;
		/** The call to action to close on. */
		callToAction: string;
		/** Narrator voice, e.g. "confident, punchy, second-person". */
		voice: string;
	};
	/** The ranked patterns behind the recommendations. */
	insights: TrendInsight[];
}

/**
 * One shot of the video. The video agent turns `visualPrompt` into a Veo clip;
 * the audio agent turns `voiceover` into a TTS track laid under that clip.
 * Veo generates ~8s max per clip, so scenes are short by construction.
 */
export interface Scene {
	/** 1-based order in the finished video. */
	index: number;
	/**
	 * A self-contained Veo prompt: subject, action, camera move, lighting, and
	 * style — everything needed to generate this shot in isolation.
	 */
	visualPrompt: string;
	/** The exact line the TTS voice speaks over this scene (may be empty). */
	voiceover: string;
	/** Optional short on-screen caption/overlay for this scene. */
	onScreenText?: string;
	/** Target length in seconds (kept ≤ 8 to fit a single Veo clip). */
	durationSeconds: number;
}

/**
 * The script writer's output: a shot list the video + audio agents execute
 * scene-by-scene. Derived from a {@link TrendReport}.
 */
export interface VideoScript {
	/** Working title for the video. */
	title: string;
	/** The hook line delivered in the first ~2 seconds. */
	hook: string;
	/** Ordered scenes, index 1..n. */
	scenes: Scene[];
	/** The closing call to action (spoken and/or shown). */
	callToAction: string;
	/** Global TTS voice direction, e.g. "confident, warm, second-person". */
	voiceDirection: string;
	/** Aspect ratio to generate at (echoed from the trend report). */
	aspectRatio: string;
	/** Sum of scene durations — a guard against over-long scripts. */
	estimatedDurationSeconds: number;
}

/** Specific direction formulated by the Analysis Agent to produce the next video */
export interface ProductionDirective {
	/** Suggested title for the next video */
	title: string;
	/** The exact hook format that matches historical winning patterns */
	hookStrategy: string;
	/** Optimal target duration in seconds */
	targetDurationSeconds: number;
	/** The core topic angle to cover */
	concept: string;
	/** Specific visual and editing style guidelines */
	visualStyle: string;
	/** Tone and pacing direction */
	pacing: string;
	/** Key keywords/tags */
	keywords: string[];
}

/** Diagnostic metric breakdown produced by the Analysis Agent */
export interface ChannelDiagnostic {
	status: "strong_growth" | "steady" | "needs_recalibration" | "initial_stage";
	summary: string;
	topStrength: string;
	criticalDropoffReason: string;
	retentionScorePct: number;
	engagementBenchmark: string;
}

/**
 * Output of the Google ADK2 Analysis Agent:
 * Deep diagnostic of channel metrics + autonomous production directives.
 */
export interface AnalysisReport {
	platform: "youtube" | "instagram" | "unified";
	channelName: string;
	analyzedAt: string;
	diagnostic: ChannelDiagnostic;
	keyLearnings: {
		whatWorked: string[];
		whatFailed: string[];
		bestPostTiming: string;
	};
	nextVideoBlueprint: ProductionDirective;
	actionItems: string[];
}
