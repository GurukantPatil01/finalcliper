/**
 * Pure analytics: turns stored daily snapshots into the structured data pack
 * consumed by the dashboard, the LLM prompt, and the rule-based report
 * fallback. No network, no React — fully unit-testable.
 */
import type {
	BucketPattern,
	DataPack,
	DailySnapshot,
	KeywordPattern,
	Performance,
	ReelDelta,
	ReelMetrics,
	Totals,
} from "./types";

/** A reel's engagement rate: interactions / views. */
export function computeEngagementRate(reel: ReelMetrics): number | null {
	const { views, likes, comments, saves, shares } = reel;
	if (!views) return null;
	const interactions = (likes ?? 0) + (comments ?? 0) + (saves ?? 0) + (shares ?? 0);
	if (interactions === 0) return 0;
	return interactions / views;
}

/** Reel ER vs. account-average ER as a fraction (0.25 = +25%). */
export function computeDeltaPct(
	reelEr: number | null,
	accountEr: number | null,
): number | null {
	if (reelEr === null || accountEr === null || accountEr === 0) return null;
	return (reelEr - accountEr) / accountEr;
}

export function classifyPerformance(deltaPct: number | null): Performance {
	if (deltaPct === null) return "average";
	if (deltaPct > 0.2) return "over";
	if (deltaPct < -0.2) return "under";
	return "average";
}

/** Latest metrics per reel id, newest-snapshot-first. Sorts internally. */
export function uniqueLatestReels(snapshots: DailySnapshot[]): ReelMetrics[] {
	const ordered = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
	const byId = new Map<string, ReelMetrics>();
	for (let i = ordered.length - 1; i >= 0; i--) {
		for (const reel of ordered[i].reels) {
			if (!byId.has(reel.id)) byId.set(reel.id, reel);
		}
	}
	return [...byId.values()];
}

function sumTotals(reels: ReelMetrics[]): Totals {
	return reels.reduce<Totals>(
		(acc, reel) => ({
			views: acc.views + (reel.views ?? 0),
			likes: acc.likes + (reel.likes ?? 0),
			comments: acc.comments + (reel.comments ?? 0),
			saves: acc.saves + (reel.saves ?? 0),
			shares: acc.shares + (reel.shares ?? 0),
			follows: acc.follows + (reel.follows ?? 0),
			reach: acc.reach + (reel.reach ?? 0),
		}),
		{ views: 0, likes: 0, comments: 0, saves: 0, shares: 0, follows: 0, reach: 0 },
	);
}

function aggregateEngagementRate(reels: ReelMetrics[]): number | null {
	const totals = sumTotals(reels);
	const interactions =
		totals.likes + totals.comments + totals.saves + totals.shares;
	if (!totals.views || interactions === 0) return null;
	return interactions / totals.views;
}

/** Views/likes are cumulative (lifetime) — a day's "gained" is the day-over-day diff. */
export function dailyViewsGained(
	snapshots: DailySnapshot[],
): { date: string; views: number }[] {
	const points: { date: string; views: number }[] = [];
	let previous: number | null = null;
	for (const snapshot of [...snapshots].sort((a, b) => a.date.localeCompare(b.date))) {
		const cumulative = snapshot.reels.reduce((sum, reel) => sum + (reel.views ?? 0), 0);
		if (previous !== null && cumulative >= previous) {
			points.push({ date: snapshot.date, views: cumulative - previous });
		}
		previous = cumulative;
	}
	return points;
}

function followersDelta(
	snapshots: DailySnapshot[],
	latest: DailySnapshot,
	days: number,
): number | null {
	if (latest.account.followersCount === null) return null;
	const cutoff = new Date(`${latest.date}T00:00:00`);
	cutoff.setDate(cutoff.getDate() - days);
	// Baseline = the closest snapshot at/before the cutoff; with sparse
	// history, fall back to the earliest snapshot so the delta stays useful.
	let baseline: DailySnapshot | null = null;
	for (const snapshot of snapshots) {
		const snapshotDate = new Date(`${snapshot.date}T00:00:00`);
		if (snapshotDate <= cutoff) baseline = snapshot;
	}
	baseline ??= snapshots[0];
	if (baseline.account.followersCount === null) return null;
	return latest.account.followersCount - baseline.account.followersCount;
}

function buildReelDelta(
	reel: ReelMetrics,
	accountEr: number | null,
): ReelDelta {
	const er = computeEngagementRate(reel);
	const deltaPct = computeDeltaPct(er, accountEr);
	return {
		reel,
		engagementRate: er,
		deltaPct,
		performance: classifyPerformance(deltaPct),
	};
}

/** Every tracked reel (latest metrics per id) with ER + delta vs account average. */
export function reelDeltas(snapshots: DailySnapshot[]): ReelDelta[] {
	const reels = uniqueLatestReels(snapshots);
	const accountEr = aggregateEngagementRate(reels);
	return reels.map((reel) => buildReelDelta(reel, accountEr));
}

const HOUR_BUCKETS: [string, number, number][] = [
	["Night (00-05)", 0, 5],
	["Morning (06-11)", 6, 11],
	["Afternoon (12-17)", 12, 17],
	["Evening (18-23)", 18, 23],
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function bucketize(
	reels: ReelDelta[],
	labelOf: (reel: ReelMetrics) => string,
	labels: string[],
): BucketPattern[] {
	return labels
		.map((label) => {
			const bucket = reels.filter((r) => labelOf(r.reel) === label);
			return {
				label,
				count: bucket.length,
				avgEngagementRate: bucket.length ? aggregateEngagementRate(bucket.map((r) => r.reel)) : null,
			};
		})
		.filter((bucket) => bucket.count > 0);
}

const STOP_WORDS = new Set([
	"this", "that", "with", "from", "have", "will", "your", "what", "when",
	"how", "why", "you", "are", "for", "the", "and", "but", "not", "was",
	"were", "they", "their", "them", "then", "than", "into", "just", "like",
	"about", "there", "here", "been", "being", "because", "should", "could",
	"would", "really", "very", "much", "more", "most", "some", "such", "over",
	"after", "before", "while", "make", "made", "want", "know", "think",
]);

/** Most frequent meaningful words across the given (top-performer) captions. */
export function topCaptionKeywords(reels: ReelMetrics[], max = 8): KeywordPattern[] {
	const counts = new Map<string, number>();
	for (const reel of reels) {
		const words = reel.caption.toLowerCase().match(/[\p{L}\p{N}']{4,}/gu) ?? [];
		for (const word of words) {
			if (STOP_WORDS.has(word)) continue;
			counts.set(word, (counts.get(word) ?? 0) + 1);
		}
	}
	return [...counts.entries()]
		.filter(([, count]) => count > 1)
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, max)
		.map(([word, count]) => ({ word, count }));
}

/** Snapshots within the `days`-day window ending on the latest snapshot day. */
function snapshotsWithin(
	snapshots: DailySnapshot[],
	latest: DailySnapshot,
	days: number,
): DailySnapshot[] {
	const cutoff = new Date(`${latest.date}T00:00:00`);
	cutoff.setDate(cutoff.getDate() - (days - 1));
	return snapshots.filter((s) => new Date(`${s.date}T00:00:00`) >= cutoff);
}

export function buildDataPack(
	allSnapshots: DailySnapshot[],
	now: Date = new Date(),
): DataPack {
	const snapshots = [...allSnapshots].sort((a, b) => a.date.localeCompare(b.date));
	if (snapshots.length === 0) {
		throw new Error("buildDataPack requires at least one snapshot.");
	}
	const latest = snapshots[snapshots.length - 1];
	const allReels = uniqueLatestReels(snapshots);
	const accountEr = aggregateEngagementRate(allReels);

	const latestReels = latest.reels.map((reel) => buildReelDelta(reel, accountEr));
	const latestTotals = sumTotals(latest.reels);

	// Rolling windows over snapshot days.
	const days30 = snapshotsWithin(snapshots, latest, 30);
	const days7 = snapshotsWithin(snapshots, latest, 7);
	const reels30 = days30.flatMap((s) => s.reels);
	const reels7 = days7.flatMap((s) => s.reels);

	const gains = dailyViewsGained(snapshots);
	const gainsInWindow = (days: number) => {
		const cutoff = new Date(`${latest.date}T00:00:00`);
		cutoff.setDate(cutoff.getDate() - (days - 1));
		return gains
			.filter((g) => new Date(`${g.date}T00:00:00`) >= cutoff)
			.reduce((sum, g) => sum + g.views, 0);
	};

	const ranked = allReels
		.map((reel) => buildReelDelta(reel, accountEr))
		.filter((r) => (r.reel.views ?? 0) > 0 && r.engagementRate !== null)
		.sort((a, b) => (b.engagementRate ?? 0) - (a.engagementRate ?? 0));
	const topReels = ranked.slice(0, 5);
	const worstReels = ranked.slice(-5).reverse();

	const notes: string[] = [];
	if (snapshots.length < 8) {
		notes.push(
			`Only ${snapshots.length} snapshot day(s) collected so far — rolling trends become reliable after a week of syncing.`,
		);
	}
	const missingViews = allReels.filter((reel) => reel.views === null).length;
	if (missingViews > 0) {
		notes.push(`${missingViews} reel(s) are missing view counts from the API.`);
	}
	if (accountEr === null) {
		notes.push("No engagement-rate data available yet.");
	}
	if (latest.account.views === null || latest.account.reach === null) {
		notes.push(
			"Some account-level insights (views/reach/profile views) are not available for this account.",
		);
	}

	return {
		generatedAt: now.toISOString(),
		account: {
			username: latest.account.username,
			followersCount: latest.account.followersCount,
			followersDelta7d: followersDelta(snapshots, latest, 7),
			followersDelta30d: followersDelta(snapshots, latest, 30),
		},
		latestDay: {
			date: latest.date,
			reels: latestReels,
			totals: latestTotals,
		},
		rolling: {
			viewsGainedPerDay: gains,
			viewsGained7d: gains.length ? gainsInWindow(7) : null,
			viewsGained30d: gains.length ? gainsInWindow(30) : null,
			engagementRate7d: aggregateEngagementRate(reels7),
			engagementRate30d: aggregateEngagementRate(reels30),
		},
		topReels,
		worstReels,
		patterns: {
			byPostHour: bucketize(ranked, postHourLabel, HOUR_BUCKETS.map((b) => b[0])),
			byWeekday: bucketize(ranked, (reel) => WEEKDAYS[new Date(reel.timestamp).getDay()], WEEKDAYS),
			topCaptionKeywords: topCaptionKeywords(
				topReels.map((r) => r.reel),
			),
		},
		notes,
		coverage: { snapshotDays: snapshots.length, reels: allReels.length },
	};
}

// ---------------------------------------------------------------------------
// Posting-hour buckets
// ---------------------------------------------------------------------------

export function postHourLabel(reel: ReelMetrics): string {
	const hour = new Date(reel.timestamp).getHours();
	for (const [label, from, to] of HOUR_BUCKETS) {
		if (hour >= from && hour <= to) return label;
	}
	return HOUR_BUCKETS[0][0];
}
