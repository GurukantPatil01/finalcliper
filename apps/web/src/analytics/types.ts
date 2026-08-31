/**
 * Shared types for the gated Instagram analytics feature.
 *
 * This module is isomorphic (safe to import from client and server) and
 * contains no network code — see graph-client.ts for the server-only
 * Instagram API calls, and docs/DECISIONS.md for the gating contract.
 */

/** Per-reel metrics pulled from `{media-id}/insights`. `null` = unavailable. */
export interface ReelMetrics {
	id: string;
	caption: string;
	permalink?: string;
	thumbnailUrl?: string;
	/** ISO timestamp the reel was posted. */
	timestamp: string;
	views: number | null;
	reach: number | null;
	likes: number | null;
	comments: number | null;
	saves: number | null;
	shares: number | null;
	follows: number | null;
	totalInteractions: number | null;
}

/** Account-level numbers for one sync (some metrics may be unavailable). */
export interface AccountMetrics {
	username?: string;
	followersCount: number | null;
	views: number | null;
	reach: number | null;
	profileViews: number | null;
}

/** One day's stored snapshot in IndexedDB (keyed by `date`). */
export interface DailySnapshot {
	/** Local calendar date, `YYYY-MM-DD`. */
	date: string;
	syncedAt: string;
	account: AccountMetrics;
	reels: ReelMetrics[];
}

export type Performance = "over" | "under" | "average";

/** A reel plus the derived numbers the dashboard and data pack need. */
export interface ReelDelta {
	reel: ReelMetrics;
	/** (likes + comments + saves + shares) / views, 0..1. */
	engagementRate: number | null;
	/** Reel ER vs. account-average ER, as a fraction (-0.25 = -25%). */
	deltaPct: number | null;
	performance: Performance;
}

export interface Totals {
	views: number;
	likes: number;
	comments: number;
	saves: number;
	shares: number;
	follows: number;
	reach: number;
}

export interface BucketPattern {
	label: string;
	count: number;
	/** Mean engagement rate across reels in the bucket. */
	avgEngagementRate: number | null;
}

export interface KeywordPattern {
	word: string;
	count: number;
}

export interface DataPack {
	generatedAt: string;
	account: {
		username?: string;
		followersCount: number | null;
		/** Follower change vs. the snapshot ~7 / ~30 days earlier. */
		followersDelta7d: number | null;
		followersDelta30d: number | null;
	};
	/** The most recent snapshot day — "yesterday" for the morning report. */
	latestDay: {
		date: string;
		reels: ReelDelta[];
		totals: Totals;
	};
	rolling: {
		/** Cumulative views/likes gained per snapshot day (day-over-day deltas). */
		viewsGainedPerDay: { date: string; views: number }[];
		viewsGained7d: number | null;
		viewsGained30d: number | null;
		engagementRate7d: number | null;
		engagementRate30d: number | null;
	};
	topReels: ReelDelta[];
	worstReels: ReelDelta[];
	patterns: {
		byPostHour: BucketPattern[];
		byWeekday: BucketPattern[];
		/** Most frequent meaningful words in top-performer captions. */
		topCaptionKeywords: KeywordPattern[];
	};
	/** Data-availability notes the report should acknowledge. */
	notes: string[];
	/** How many snapshot days and reels the analysis rests on. */
	coverage: { snapshotDays: number; reels: number };
}

/** A generated report, stored in IndexedDB alongside its data pack. */
export interface StoredReport {
	id: string;
	createdAt: string;
	/** The snapshot date the analysis is based on. */
	forDate: string;
	/** "rule-based", an LLM model name, or "gemini". */
	source: string;
	markdown: string;
	dataPack: DataPack;
}
