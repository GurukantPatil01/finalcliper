import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
	extractYouTubeToken,
	youtubeTokenRequiredResponse,
} from "../../_shared";
import type {
	YouTubeChannelMetrics,
	YouTubeDailySnapshot,
	YouTubeVideoMetrics,
} from "@/analytics/youtube-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Parse ISO 8601 duration (e.g. PT1M30S) into seconds. */
function parseISO8601Duration(duration: string): number {
	const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) return 0;
	const hours = parseInt(match[1] || "0", 10);
	const minutes = parseInt(match[2] || "0", 10);
	const seconds = parseInt(match[3] || "0", 10);
	return hours * 3600 + minutes * 60 + seconds;
}

function toDateKey(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export async function POST(request: NextRequest) {
	const token = extractYouTubeToken(request);
	if (!token) {
		return youtubeTokenRequiredResponse();
	}

	try {
		// 1. Fetch channel profile and uploads playlist ID
		const channelRes = await fetch(
			"https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
			{
				headers: { Authorization: `Bearer ${token}` },
			},
		);

		if (!channelRes.ok) {
			const errData = await channelRes.json().catch(() => null);
			const rawMsg = errData?.error?.message;
			let userMsg = rawMsg || `Failed to fetch YouTube channel (${channelRes.status}).`;
			if (channelRes.status === 403 && rawMsg?.includes("has not been used in project")) {
				userMsg =
					"YouTube Data API v3 is disabled in your Google Cloud Project. Please enable it in Google Cloud Console: https://console.cloud.google.com/apis/library/youtube.googleapis.com";
			}
			return NextResponse.json(
				{ error: "youtube_api_error", message: userMsg },
				{ status: channelRes.status },
			);
		}

		const channelData = await channelRes.json();
		const channelItem = channelData.items?.[0];
		if (!channelItem) {
			// If no channel exists yet, create an empty snapshot
			const snapshot: YouTubeDailySnapshot = {
				date: toDateKey(new Date()),
				syncedAt: new Date().toISOString(),
				channel: {
					channelId: "my_channel",
					title: "YouTube Channel",
					subscriberCount: 0,
					totalViews: 0,
					totalVideos: 0,
				},
				videos: [],
			};
			return NextResponse.json({ success: true, snapshot });
		}

		const channel: YouTubeChannelMetrics = {
			channelId: channelItem.id,
			title: channelItem.snippet?.title || "YouTube Channel",
			customUrl: channelItem.snippet?.customUrl,
			avatarUrl:
				channelItem.snippet?.thumbnails?.default?.url ||
				channelItem.snippet?.thumbnails?.medium?.url,
			subscriberCount: parseInt(channelItem.statistics?.subscriberCount || "0", 10),
			totalViews: parseInt(channelItem.statistics?.viewCount || "0", 10),
			totalVideos: parseInt(channelItem.statistics?.videoCount || "0", 10),
		};

		const uploadsPlaylistId = channelItem.contentDetails?.relatedPlaylists?.uploads;
		let videos: YouTubeVideoMetrics[] = [];

		if (uploadsPlaylistId) {
			// 2. Fetch recent playlist items (videos)
			const playlistRes = await fetch(
				`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=30`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			if (playlistRes.ok) {
				const playlistData = await playlistRes.json();
				const videoIds = (playlistData.items || [])
					.map((item: any) => item.contentDetails?.videoId)
					.filter(Boolean);

				if (videoIds.length > 0) {
					// 3. Fetch detailed stats & duration for these videos
					const videosRes = await fetch(
						`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(",")}`,
						{
							headers: { Authorization: `Bearer ${token}` },
						},
					);

					if (videosRes.ok) {
						const videosData = await videosRes.json();

						videos = (videosData.items || []).map((v: any) => {
							const durationSec = parseISO8601Duration(v.contentDetails?.duration || "PT0S");
							const title = v.snippet?.title || "Untitled";
							const desc = v.snippet?.description || "";
							const isShort =
								durationSec <= 60 ||
								title.toLowerCase().includes("#shorts") ||
								desc.toLowerCase().includes("#shorts");

							const views = parseInt(v.statistics?.viewCount || "0", 10);
							const likes = parseInt(v.statistics?.likeCount || "0", 10);
							const comments = parseInt(v.statistics?.commentCount || "0", 10);

							// Estimate minutes watched and average view duration
							const estMinutes = Math.round((views * (durationSec * 0.65)) / 60);
							const avgDuration = Math.round(durationSec * 0.65);

							return {
								id: v.id,
								title,
								description: desc,
								thumbnailUrl:
									v.snippet?.thumbnails?.high?.url ||
									v.snippet?.thumbnails?.medium?.url ||
									v.snippet?.thumbnails?.default?.url,
								publishedAt: v.snippet?.publishedAt || new Date().toISOString(),
								isShort,
								durationSeconds: durationSec,
								views,
								likes,
								comments,
								shares: Math.round(likes * 0.15), // heuristic when analytics API is not queried
								estimatedMinutesWatched: estMinutes,
								averageViewDurationSeconds: avgDuration,
								averageViewPercentage: 65.0,
								subscribersGained: Math.round(views * 0.004),
							};
						});
					}
				}
			}
		}

		// 4. Try optional YouTube Analytics API for deeper watch-time and metrics
		try {
			const endDate = toDateKey(new Date());
			const startDateObj = new Date();
			startDateObj.setDate(startDateObj.getDate() - 30);
			const startDate = toDateKey(startDateObj);

			const ytAnalyticsRes = await fetch(
				`https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,shares&dimensions=video`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			if (ytAnalyticsRes.ok) {
				const analyticsData = await ytAnalyticsRes.json();
				const rows = analyticsData.rows || [];
				const map = new Map<string, any>();
				for (const row of rows) {
					// row: [videoId, views, estimatedMinutesWatched, averageViewDuration, averageViewPercentage, subscribersGained, shares]
					map.set(row[0], {
						views: row[1],
						estimatedMinutesWatched: row[2],
						averageViewDurationSeconds: row[3],
						averageViewPercentage: row[4],
						subscribersGained: row[5],
						shares: row[6],
					});
				}

				videos = videos.map((video) => {
					const report = map.get(video.id);
					if (!report) return video;
					return {
						...video,
						views: report.views ?? video.views,
						estimatedMinutesWatched: Math.round(report.estimatedMinutesWatched ?? video.estimatedMinutesWatched),
						averageViewDurationSeconds: Math.round(report.averageViewDurationSeconds ?? video.averageViewDurationSeconds),
						averageViewPercentage: report.averageViewPercentage ?? video.averageViewPercentage,
						subscribersGained: report.subscribersGained ?? video.subscribersGained,
						shares: report.shares ?? video.shares,
					};
				});
			}
		} catch (analyticsErr) {
			// YouTube Analytics API failure is non-blocking — Data API results are preserved
			console.warn("YouTube Analytics API query skipped:", analyticsErr);
		}

		const snapshot: YouTubeDailySnapshot = {
			date: toDateKey(new Date()),
			syncedAt: new Date().toISOString(),
			channel,
			videos,
		};

		return NextResponse.json({ success: true, snapshot });
	} catch (error) {
		console.error("YouTube sync error:", error);
		return NextResponse.json(
			{
				error: "sync_failed",
				message: error instanceof Error ? error.message : "Failed to sync YouTube data.",
			},
			{ status: 500 },
		);
	}
}
