/**
 * Prompt construction for the LLM morning report. The prompt must produce a
 * markdown report with exactly three sections so reports read consistently
 * whether they came from an LLM or the rule-based fallback.
 */
import type { DataPack } from "./types";

export const REPORT_SYSTEM_INSTRUCTION =
	"You are an Instagram growth analyst writing a short morning briefing for a " +
	"creator. You are given a structured data pack of their Reels analytics. " +
	"Ground every claim in the numbers provided — never invent metrics. Be direct, " +
	"concrete, and practical. Output markdown with exactly three level-2 headings: " +
	"`## Yesterday`, `## What's working`, `## Actions for today`. " +
	"Keep the whole report under 450 words.";

export function buildReportPrompt(pack: DataPack): string {
	const { latestDay, rolling, account, patterns, topReels, worstReels, coverage, notes } =
		pack;
	const fmtPct = (value: number | null) =>
		value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
	const reelLines = (deltas: typeof topReels) =>
		deltas
			.map((d) => {
				const r = d.reel;
				const posted = new Date(r.timestamp).toISOString().slice(0, 16).replace("T", " ");
				return [
					`- id=${r.id} posted=${posted}UTC`,
					`views=${r.views ?? "?"} likes=${r.likes ?? "?"} comments=${r.comments ?? "?"} saves=${r.saves ?? "?"} shares=${r.shares ?? "?"} follows=${r.follows ?? "?"}`,
					`ER=${fmtPct(d.engagementRate)} vs avg=${d.deltaPct === null ? "?" : `${(d.deltaPct * 100).toFixed(0)}%`} (${d.performance})`,
					`caption=${JSON.stringify(r.caption.slice(0, 140))}`,
				].join(" | ");
			})
			.join("\n");

	return [
		"DATA PACK (Instagram Reels analytics):",
		"",
		`Account: @${account.username ?? "unknown"}; followers=${account.followersCount ?? "?"} (7d Δ=${account.followersDelta7d ?? "?"}, 30d Δ=${account.followersDelta30d ?? "?"})`,
		`Coverage: ${coverage.snapshotDays} snapshot day(s), ${coverage.reels} reels analyzed. Generated ${pack.generatedAt}.`,
		`Latest snapshot day: ${latestDay.date} — totals: views=${latestDay.totals.views} likes=${latestDay.totals.likes} comments=${latestDay.totals.comments} saves=${latestDay.totals.saves} shares=${latestDay.totals.shares} follows=${latestDay.totals.follows}`,
		`Rolling: views gained 7d=${rolling.viewsGained7d ?? "?"} 30d=${rolling.viewsGained30d ?? "?"}; engagement rate 7d=${fmtPct(rolling.engagementRate7d)} 30d=${fmtPct(rolling.engagementRate30d)}`,
		"",
		"REELS POSTED ON / SINCE THE LATEST DAY:",
		latestDay.reels.length ? reelLines(latestDay.reels) : "(no new reels — write Yesterday about the latest day's cumulative performance instead)",
		"",
		"TOP PERFORMERS:",
		reelLines(topReels),
		"",
		"WORST PERFORMERS:",
		reelLines(worstReels),
		"",
		"PATTERNS:",
		`Post hour: ${patterns.byPostHour.map((b) => `${b.label}: n=${b.count} ER=${fmtPct(b.avgEngagementRate)}`).join("; ") || "n/a"}`,
		`Weekday: ${patterns.byWeekday.map((b) => `${b.label}: n=${b.count} ER=${fmtPct(b.avgEngagementRate)}`).join("; ") || "n/a"}`,
		`Top-caption keywords: ${patterns.topCaptionKeywords.map((k) => `${k.word}(${k.count})`).join(", ") || "n/a"}`,
		"",
		"DATA NOTES: " + (notes.length ? notes.join(" ") : "none"),
		"",
		"TASK: Write the morning report. In `## Yesterday`, summarize how the most " +
			"recent reels performed with concrete numbers. In `## What's working`, name " +
			"cross-reel patterns (posting time, topics/keywords, engagement drivers) " +
			"evidenced by the data. In `## Actions for today`, give exactly 3-5 " +
			"actionable bullets, each tied to a specific number or pattern above.",
	].join("\n");
}
