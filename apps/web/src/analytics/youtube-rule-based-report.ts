import type { YouTubeDataPack } from "./youtube-types";

const fmt = (n: number | null | undefined) =>
	n === null || n === undefined ? "—" : new Intl.NumberFormat("en-US").format(n);

export function generateYouTubeRuleBasedReport(pack: YouTubeDataPack): string {
	const latest = pack.latestDay;
	const totals = latest.totals;
	const channel = pack.channel;
	const insights = pack.insights;

	const topVideo = insights.topPerformingVideos[0];
	const underVideo = insights.underPerformingVideos[0];

	const watchHours = (totals.estimatedMinutesWatched / 60).toFixed(1);

	let shortsNote = "You have balanced Shorts and Long-form uploads.";
	if (insights.shortsVsLongForm.shortsAvgViews > insights.shortsVsLongForm.longFormAvgViews * 1.5) {
		shortsNote =
			"Shorts are significantly outperforming long-form uploads in top-of-funnel reach. Use Shorts as discovery hooks linking to deep dives.";
	} else if (insights.shortsVsLongForm.longFormAvgViews > insights.shortsVsLongForm.shortsAvgViews) {
		shortsNote =
			"Long-form content is driving steady watch time and subscriber conversion. Keep investing in high-retention structured videos.";
	}

	return `# YouTube Growth Report — ${latest.date}

## 1. Yesterday's Numbers
- **Total Views**: ${fmt(totals.views)} views across tracked catalog
- **Watch Time**: ~${watchHours} hours (${fmt(totals.estimatedMinutesWatched)} minutes)
- **Subscribers**: ${fmt(channel.subscriberCount)} subscribers ${
		channel.subscriberDelta7d ? `(${channel.subscriberDelta7d > 0 ? "+" : ""}${channel.subscriberDelta7d} in last 7d)` : ""
	}
- **Top Performer**: "${topVideo ? topVideo.video.title : "N/A"}" (${fmt(topVideo?.video.views)} views, ${(
		(topVideo?.engagementRate || 0) * 100
	).toFixed(1)}% ER)

## 2. Retention & Format Breakdown
- **Catalog Balance**: ${latest.shortsCount} Shorts vs ${latest.longFormCount} Long-form videos.
- **Shorts Avg Views**: ${fmt(insights.shortsVsLongForm.shortsAvgViews)} vs Long-form ${fmt(
		insights.shortsVsLongForm.longFormAvgViews,
	)}.
- **Format Insight**: ${shortsNote}

## 3. What Worked & What Stalled
- **Winning Angle**: High engagement on *${topVideo ? topVideo.video.title : "recent uploads"}* with strong audience interaction.
${
	underVideo
		? `- **Underperforming Element**: *${underVideo.video.title}* had a lower retention delta (${(underVideo.deltaPct * 100).toFixed(0)}% vs average). Consider refreshing thumbnail and the first 5-second hook.`
		: "- **Consistency**: All recent videos met benchmark channel interaction thresholds."
}

## 4. Today's Action Plan (Next 3 Steps)
1. **[PRODUCE SHORT]**: Cut a 30-45s vertical clip summarizing the most engaging insight from *"${topVideo ? topVideo.video.title : "your top video"}"*.
2. **[OPTIMIZE HOOK]**: Ensure your next video delivers on the title in the first 3 seconds to push retention past 70%.
3. **[PINNED COMMENT]**: Add a pinned question or resource link on your latest upload to boost comment velocity.`;
}
