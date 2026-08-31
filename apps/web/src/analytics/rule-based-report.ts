/**
 * Rule-based report generator — the offline/no-key fallback so the morning
 * report feature works without any LLM configured. Produces the same three
 * markdown sections as the LLM prompt, derived mechanically from the data pack.
 */
import type { DataPack, ReelDelta } from "./types";

const fmtInt = (n: number | null | undefined) =>
	typeof n === "number" ? n.toLocaleString("en-US") : "n/a";
const fmtPct = (value: number | null) =>
	value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
const fmtSigned = (n: number | null) =>
	n === null ? "n/a" : `${n > 0 ? "+" : ""}${n.toLocaleString("en-US")}`;

function describeReel(delta: ReelDelta): string {
	const r = delta.reel;
	const title = r.caption.split("\n")[0].slice(0, 60) || r.id;
	const deltaText =
		delta.deltaPct === null
			? "no average to compare yet"
			: `${delta.deltaPct > 0 ? "+" : ""}${(delta.deltaPct * 100).toFixed(0)}% vs your average (${delta.performance}-performer)`;
	return `- **${title}** — ${fmtInt(r.views)} views, ${fmtInt(r.likes)} likes, ${fmtInt(r.comments)} comments, ${fmtInt(r.saves)} saves, ${fmtInt(r.shares)} shares, ${fmtInt(r.follows)} follows. ER ${fmtPct(delta.engagementRate)}, ${deltaText}.`;
}

export function buildRuleBasedReport(pack: DataPack): string {
	const { latestDay, rolling, account, patterns } = pack;

	const yesterday = latestDay.reels.length
		? latestDay.reels.map(describeReel).join("\n")
		: `- No new reels in the latest snapshot (${latestDay.date}). Cumulative activity that day: ${fmtInt(latestDay.totals.views)} lifetime views across tracked reels, ${fmtInt(latestDay.totals.follows)} total follows generated.`;

	const working: string[] = [];
	const bestHour = [...patterns.byPostHour]
		.filter((b) => b.avgEngagementRate !== null)
		.sort((a, b) => (b.avgEngagementRate ?? 0) - (a.avgEngagementRate ?? 0))[0];
	if (bestHour) {
		working.push(
			`**Post timing:** reels posted ${bestHour.label} average ${fmtPct(bestHour.avgEngagementRate)} engagement across ${bestHour.count} reel(s).`,
		);
	}
	const bestWeekday = [...patterns.byWeekday]
		.filter((b) => b.avgEngagementRate !== null)
		.sort((a, b) => (b.avgEngagementRate ?? 0) - (a.avgEngagementRate ?? 0))[0];
	if (bestWeekday) {
		working.push(
			`**Best day:** ${bestWeekday.label} posts average ${fmtPct(bestWeekday.avgEngagementRate)} engagement across ${bestWeekday.count} reel(s).`,
		);
	}
	if (patterns.topCaptionKeywords.length) {
		working.push(
			`**Recurring topics in top performers:** ${patterns.topCaptionKeywords.map((k) => `${k.word} (${k.count}×)`).join(", ")}.`,
		);
	}
	if (pack.topReels.length) {
		const top = pack.topReels[0];
		working.push(
			`**Strongest reel:** ${describeReel(top).replace(/^- \*\*/, "").replace(/\*\*$/, "")}`,
		);
	}
	if (rolling.viewsGained7d !== null) {
		working.push(
			`**Momentum:** ${fmtInt(rolling.viewsGained7d)} views gained in the last 7 days (${fmtInt(rolling.viewsGained30d)} over 30).`,
		);
	}
	if (working.length === 0) {
		working.push("Not enough data yet to identify patterns — keep syncing daily.");
	}

	const actions: string[] = [];
	const under = pack.worstReels.filter((r) => r.performance === "under");
	if (pack.topReels.length) {
		const top = pack.topReels[0].reel;
		actions.push(
			`Remake what works: cut a new variation of "${top.caption.split("\n")[0].slice(0, 60) || top.id}" (ER ${fmtPct(pack.topReels[0].engagementRate)}) within the next 48 hours.`,
		);
	}
	if (bestHour) {
		actions.push(
			`Post today inside the ${bestHour.label} window — that's your best-engagement slot (${fmtPct(bestHour.avgEngagementRate)} avg ER).`,
		);
	}
	if (under.length) {
		const worst = under[0];
		actions.push(
			`Diagnose "${worst.reel.caption.split("\n")[0].slice(0, 60) || worst.reel.id}" (${worst.deltaPct === null ? "below average" : `${(worst.deltaPct * 100).toFixed(0)}% under average`}): check the first 2 seconds (hook), caption, and whether it was posted outside your best window.`,
		);
	}
	if (account.followersCount !== null && (account.followersDelta30d ?? 0) <= 0) {
		actions.push(
			`Followers are flat (30-day Δ ${fmtSigned(account.followersDelta30d)}): add a clear follow hook / series teaser to today's reel — reels generating ${fmtInt(latestDay.totals.follows)} follows so far is where conversion shows up.`,
		);
	}
	actions.push(
		`Sync the dashboard again tonight so tomorrow's report compares a full day of data (currently ${pack.coverage.snapshotDays} snapshot day(s)).`,
	);
	const threeToFive = actions.slice(0, 5);

	const notes = pack.notes.length
		? `\n> [!NOTE]\n> ${pack.notes.join(" ")}\n`
		: "";

	return [
		`## Yesterday (${latestDay.date})`,
		"",
		`Latest snapshot for **@${account.username ?? "unknown"}** — followers ${fmtInt(account.followersCount)} (7d ${fmtSigned(account.followersDelta7d)}, 30d ${fmtSigned(account.followersDelta30d)}).`,
		"",
		yesterday,
		notes,
		"## What's working",
		"",
		...working.map((line) => `- ${line}`),
		"",
		"## Actions for today",
		"",
		...threeToFive.map((line, i) => `${i + 1}. ${line}`),
		"",
		`_Generated from ${pack.coverage.snapshotDays} snapshot day(s) covering ${pack.coverage.reels} reels · rule-based (no LLM configured)._`,
	].join("\n");
}
