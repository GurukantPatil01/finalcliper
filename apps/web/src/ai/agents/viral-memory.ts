/**
 * Self-Evolving Viral Creator Memory System.
 *
 * Tracks currently booming creator formats, hook archetypes, and editing styles.
 * Evolving memory dynamically learns which formats succeed from channel analytics
 * and continually adapts generation prompts to mirror what top creators are doing right now.
 */

export interface ViralFormatPattern {
	id: string;
	title: string;
	category: "hook" | "pacing" | "visual_style" | "narrative" | "sound_design";
	description: string;
	/** Virality/confidence score, evolves 0.0 - 1.0 */
	confidenceScore: number;
	example: string;
	firstObserved: string;
	lastReinforced: string;
	timesUsed: number;
}

const DEFAULT_BOOMING_PATTERNS: ViralFormatPattern[] = [
	{
		id: "pattern-cold-open-shock",
		title: "Extreme Negative Consequence Hook",
		category: "hook",
		description: "Opens by showing the disastrous result of common creator/user advice before revealing the fix.",
		confidenceScore: 0.94,
		example: "“This one setting was secretly destroying 80% of my video reach...”",
		firstObserved: "2026-01-10",
		lastReinforced: "2026-08-30",
		timesUsed: 18,
	},
	{
		id: "pattern-micro-documentary",
		title: "Cinematic Micro-Doc Pacing",
		category: "pacing",
		description: "1.2s rapid-cut B-roll montage synced to punchy kick beats, alternating with a slow punch-in payoff.",
		confidenceScore: 0.91,
		example: "Flash zooms on key phrases + subtle sound swooshes on text reveal.",
		firstObserved: "2026-02-15",
		lastReinforced: "2026-08-29",
		timesUsed: 14,
	},
	{
		id: "pattern-infinite-loop",
		title: "Seamless Retention Loop",
		category: "narrative",
		description: "The final line of the voiceover completes the opening sentence, driving 120%+ retention.",
		confidenceScore: 0.89,
		example: "Final words: '...and that is why you should always...' -> Loop back to start: '...start your day with...'",
		firstObserved: "2026-03-01",
		lastReinforced: "2026-08-31",
		timesUsed: 22,
	},
	{
		id: "pattern-brutalist-contrast",
		title: "High-Contrast Kinetic Text Punch-In",
		category: "visual_style",
		description: "Bold monochrome kinetic text with neon accents highlighting exactly 1 key operative word per frame.",
		confidenceScore: 0.88,
		example: "Black heavy typography with highlighter yellow keyword box.",
		firstObserved: "2026-04-10",
		lastReinforced: "2026-08-28",
		timesUsed: 16,
	},
	{
		id: "pattern-pov-curiosity",
		title: "First-Person Discovery Arc",
		category: "narrative",
		description: "Takes the viewer along on a personal test or experiment with high stakes.",
		confidenceScore: 0.86,
		example: "“I tested the #1 viral strategy for 7 days, and here is what happened to my analytics...”",
		firstObserved: "2026-05-12",
		lastReinforced: "2026-08-31",
		timesUsed: 12,
	},
];

let inMemoryStore: ViralFormatPattern[] = [...DEFAULT_BOOMING_PATTERNS];

/**
 * Get active booming patterns ordered by confidence and evolution score.
 */
export function getActiveViralPatterns(): ViralFormatPattern[] {
	return [...inMemoryStore].sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Build a prompt context describing the currently active, evolving creator meta.
 */
export function getEvolvingMetaPrompt(): string {
	const patterns = getActiveViralPatterns().slice(0, 4);
	let prompt = "\nCURRENTLY BOOMING CREATOR METAS & FORMATS (EVOLVING MEMORY):\n";
	for (const p of patterns) {
		prompt += `- [${p.category.toUpperCase()}] "${p.title}": ${p.description} (e.g. ${p.example})\n`;
	}
	prompt += "Incorporate these booming dynamics to maximize retention and shareability.\n";
	return prompt;
}

/**
 * Reinforce a pattern based on positive channel metrics (e.g. high retention).
 */
export function reinforcePattern(id: string, boost: number = 0.05): void {
	const item = inMemoryStore.find((p) => p.id === id);
	if (item) {
		item.confidenceScore = Math.min(1.0, item.confidenceScore + boost);
		item.lastReinforced = new Date().toISOString();
		item.timesUsed += 1;
	}
}

/**
 * Register a newly discovered trending creator format into memory.
 */
export function recordLearnedPattern(pattern: Omit<ViralFormatPattern, "id" | "firstObserved" | "lastReinforced" | "timesUsed">): ViralFormatPattern {
	const newEntry: ViralFormatPattern = {
		id: `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
		...pattern,
		firstObserved: new Date().toISOString(),
		lastReinforced: new Date().toISOString(),
		timesUsed: 1,
	};
	inMemoryStore.push(newEntry);
	return newEntry;
}
