import type {
	YouTubeDailySnapshot,
	YouTubeDataPack,
	YouTubePerformance,
	YouTubeTotals,
	YouTubeVideoDelta,
} from "./youtube-types";

function computeVideoDelta(
	video: YouTubeDailySnapshot["videos"][number],
	avgEngagementRate: number,
): YouTubeVideoDelta {
	const interactions = (video.likes || 0) + (video.comments || 0) + (video.shares || 0);
	const engagementRate = video.views > 0 ? interactions / video.views : 0;
	const deltaPct =
		avgEngagementRate > 0 ? (engagementRate - avgEngagementRate) / avgEngagementRate : 0;

	let performance: YouTubePerformance = "average";
	if (deltaPct >= 0.15) performance = "over";
	else if (deltaPct <= -0.15) performance = "under";

	const retentionPct = video.averageViewPercentage || 50;

	return {
		video,
		engagementRate,
		deltaPct,
		performance,
		retentionPct,
	};
}

export function buildYouTubeDataPack(snapshots: YouTubeDailySnapshot[]): YouTubeDataPack {
	if (snapshots.length === 0) {
		throw new Error("Cannot build YouTubeDataPack from empty snapshots.");
	}

	const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
	const latest = sorted[sorted.length - 1];

	// Totals for latest snapshot
	const totals: YouTubeTotals = latest.videos.reduce(
		(acc, v) => ({
			views: acc.views + (v.views || 0),
			likes: acc.likes + (v.likes || 0),
			comments: acc.comments + (v.comments || 0),
			shares: acc.shares + (v.shares || 0),
			estimatedMinutesWatched: acc.estimatedMinutesWatched + (v.estimatedMinutesWatched || 0),
			subscribersGained: acc.subscribersGained + (v.subscribersGained || 0),
		}),
		{
			views: 0,
			likes: 0,
			comments: 0,
			shares: 0,
			estimatedMinutesWatched: 0,
			subscribersGained: 0,
		},
	);

	const totalInteractions = totals.likes + totals.comments + totals.shares;
	const avgChannelER = totals.views > 0 ? totalInteractions / totals.views : 0;

	const videoDeltas = latest.videos.map((v) => computeVideoDelta(v, avgChannelER));

	// Split Shorts vs Long-form
	const shorts = videoDeltas.filter((vd) => vd.video.isShort);
	const longForm = videoDeltas.filter((vd) => !vd.video.isShort);

	const shortsAvgViews =
		shorts.length > 0
			? Math.round(shorts.reduce((sum, s) => sum + s.video.views, 0) / shorts.length)
			: 0;
	const longFormAvgViews =
		longForm.length > 0
			? Math.round(longForm.reduce((sum, l) => sum + l.video.views, 0) / longForm.length)
			: 0;

	const shortsAvgEngagement =
		shorts.length > 0
			? shorts.reduce((sum, s) => sum + s.engagementRate, 0) / shorts.length
			: 0;
	const longFormAvgEngagement =
		longForm.length > 0
			? longForm.reduce((sum, l) => sum + l.engagementRate, 0) / longForm.length
			: 0;

	// Top and under-performing videos
	const sortedByViews = [...videoDeltas].sort((a, b) => b.video.views - a.video.views);
	const topPerforming = sortedByViews.slice(0, 5);
	const underPerforming = [...videoDeltas]
		.filter((vd) => vd.performance === "under")
		.sort((a, b) => a.deltaPct - b.deltaPct)
		.slice(0, 5);

	// Rolling history calculation (day-over-day view gains)
	const viewsGainedPerDay: { date: string; views: number }[] = [];
	for (let i = 0; i < sorted.length; i++) {
		const current = sorted[i];
		const currentViews = current.videos.reduce((sum, v) => sum + v.views, 0);
		if (i === 0) {
			viewsGainedPerDay.push({ date: current.date, views: 0 });
		} else {
			const prev = sorted[i - 1];
			const prevViews = prev.videos.reduce((sum, v) => sum + v.views, 0);
			viewsGainedPerDay.push({
				date: current.date,
				views: Math.max(0, currentViews - prevViews),
			});
		}
	}

	// 7d & 30d deltas
	const findPriorSnapshot = (daysAgo: number) => {
		if (sorted.length < 2) return null;
		const targetDate = new Date(latest.date);
		targetDate.setDate(targetDate.getDate() - daysAgo);
		const targetKey = targetDate.toISOString().slice(0, 10);

		// Closest snapshot at or before targetDate
		let best: YouTubeDailySnapshot | null = null;
		for (const s of sorted) {
			if (s.date <= targetKey) best = s;
		}
		return best;
	};

	const snap7d = findPriorSnapshot(7);
	const snap30d = findPriorSnapshot(30);

	const viewsGained7d = snap7d
		? Math.max(
				0,
				totals.views - snap7d.videos.reduce((sum, v) => sum + v.views, 0),
			)
		: null;
	const viewsGained30d = snap30d
		? Math.max(
				0,
				totals.views - snap30d.videos.reduce((sum, v) => sum + v.views, 0),
			)
		: null;

	const subscriberDelta7d = snap7d
		? latest.channel.subscriberCount - snap7d.channel.subscriberCount
		: null;
	const subscriberDelta30d = snap30d
		? latest.channel.subscriberCount - snap30d.channel.subscriberCount
		: null;

	return {
		generatedAt: new Date().toISOString(),
		channel: {
			title: latest.channel.title,
			customUrl: latest.channel.customUrl,
			subscriberCount: latest.channel.subscriberCount,
			subscriberDelta7d,
			subscriberDelta30d,
		},
		latestDay: {
			date: latest.date,
			videos: videoDeltas,
			totals,
			shortsCount: shorts.length,
			longFormCount: longForm.length,
		},
		rolling: {
			viewsGainedPerDay,
			viewsGained7d,
			viewsGained30d,
			watchTimeMinutes7d: Math.round(totals.estimatedMinutesWatched * 0.25),
			watchTimeMinutes30d: totals.estimatedMinutesWatched,
			avgRetentionPct7d:
				videoDeltas.length > 0
					? Math.round(
							videoDeltas.reduce((sum, v) => sum + v.retentionPct, 0) / videoDeltas.length,
						)
					: null,
		},
		insights: {
			topPerformingVideos: topPerforming,
			underPerformingVideos: underPerforming,
			shortsVsLongForm: {
				shortsAvgViews,
				longFormAvgViews,
				shortsAvgEngagement,
				longFormAvgEngagement,
			},
		},
	};
}
