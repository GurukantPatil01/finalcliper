/**
 * Shared types for the gated YouTube analytics feature.
 *
 * This module is isomorphic (safe to import from client and server) and
 * contains no network code.
 */

/** Per-video metrics pulled from YouTube Data API v3 & YouTube Analytics API. */
export interface YouTubeVideoMetrics {
	id: string;
	title: string;
	description: string;
	thumbnailUrl?: string;
	publishedAt: string;
	/** Whether the video is classified as a YouTube Short (<60s vertical). */
	isShort: boolean;
	durationSeconds: number;
	views: number;
	likes: number;
	comments: number;
	shares?: number;
	estimatedMinutesWatched: number;
	averageViewDurationSeconds: number;
	averageViewPercentage?: number;
	subscribersGained?: number;
}

/** Channel-level overview metrics for one sync. */
export interface YouTubeChannelMetrics {
	channelId: string;
	title: string;
	customUrl?: string;
	avatarUrl?: string;
	subscriberCount: number;
	totalViews: number;
	totalVideos: number;
}

/** One day's stored snapshot in IndexedDB (keyed by `date`). */
export interface YouTubeDailySnapshot {
	/** Local calendar date, `YYYY-MM-DD`. */
	date: string;
	syncedAt: string;
	channel: YouTubeChannelMetrics;
	videos: YouTubeVideoMetrics[];
}

export type YouTubePerformance = "over" | "under" | "average";

/** A video plus derived comparison numbers for dashboard and data pack. */
export interface YouTubeVideoDelta {
	video: YouTubeVideoMetrics;
	/** (likes + comments + shares) / views, 0..1. */
	engagementRate: number;
	/** Video ER vs channel-average ER, as a fraction (-0.25 = -25%). */
	deltaPct: number;
	performance: YouTubePerformance;
	/** Retention score: averageViewPercentage or ratio of duration watched. */
	retentionPct: number;
}

export interface YouTubeTotals {
	views: number;
	likes: number;
	comments: number;
	shares: number;
	estimatedMinutesWatched: number;
	subscribersGained: number;
}

export interface YouTubeDataPack {
	generatedAt: string;
	channel: {
		title: string;
		customUrl?: string;
		subscriberCount: number;
		subscriberDelta7d: number | null;
		subscriberDelta30d: number | null;
	};
	latestDay: {
		date: string;
		videos: YouTubeVideoDelta[];
		totals: YouTubeTotals;
		shortsCount: number;
		longFormCount: number;
	};
	rolling: {
		viewsGainedPerDay: { date: string; views: number }[];
		viewsGained7d: number | null;
		viewsGained30d: number | null;
		watchTimeMinutes7d: number | null;
		watchTimeMinutes30d: number | null;
		avgRetentionPct7d: number | null;
	};
	insights: {
		topPerformingVideos: YouTubeVideoDelta[];
		underPerformingVideos: YouTubeVideoDelta[];
		shortsVsLongForm: {
			shortsAvgViews: number;
			longFormAvgViews: number;
			shortsAvgEngagement: number;
			longFormAvgEngagement: number;
		};
	};
}
