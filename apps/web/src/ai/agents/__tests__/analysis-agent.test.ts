import { describe, expect, it } from "bun:test";
import { matchLocalEditorCommand } from "@/ai/chat/copilot-parser";
import type { YouTubeDataPack } from "@/analytics/youtube-types";

describe("Analysis Agent & Autonomous Workflow", () => {
	it("matches analyze commands correctly", () => {
		expect(matchLocalEditorCommand("analyze")).toEqual({
			type: "analyze_and_produce",
		});
		expect(matchLocalEditorCommand("analyze channel")).toEqual({
			type: "analyze_and_produce",
		});
		expect(matchLocalEditorCommand("/analyze")).toEqual({
			type: "analyze_and_produce",
		});
		expect(matchLocalEditorCommand("auto create")).toEqual({
			type: "analyze_and_produce",
		});
		expect(matchLocalEditorCommand("produce from analytics")).toEqual({
			type: "analyze_and_produce",
		});
	});

	it("formats YouTube and Instagram data packs for analysis prompt", () => {
		const mockYtPack: YouTubeDataPack = {
			channel: {
				title: "Tech Creator",
				customUrl: "@techcreator",
				subscriberCount: 15000,
				subscriberDelta7d: 120,
				subscriberDelta30d: 450,
			},
			latestDay: {
				date: "2026-08-31",
				videos: [],
				totals: {
					views: 5200,
					estimatedMinutesWatched: 12400,
					subscribersGained: 45,
					likes: 320,
					comments: 48,
					shares: 22,
				},
				shortsCount: 20,
				longFormCount: 22,
			},
			rolling: {
				viewsGainedPerDay: [],
				viewsGained7d: 34000,
				viewsGained30d: 120000,
				watchTimeMinutes7d: 82000,
				watchTimeMinutes30d: 310000,
				avgRetentionPct7d: 68.2,
			},
			insights: {
				shortsVsLongForm: {
					shortsAvgViews: 4500,
					longFormAvgViews: 1200,
					shortsAvgEngagement: 0.08,
					longFormAvgEngagement: 0.04,
				},
				topPerformingVideos: [
					{
						video: {
							id: "vid-1",
							title: "Top 5 AI Tools in 2026",
							description: "AI Tools",
							publishedAt: "2026-08-28T12:00:00Z",
							durationSeconds: 45,
							averageViewDurationSeconds: 35.2,
							views: 12000,
							estimatedMinutesWatched: 4000,
							likes: 800,
							comments: 90,
							shares: 40,
							isShort: true,
						},
						engagementRate: 0.077,
						deltaPct: 0.25,
						performance: "over",
						retentionPct: 78.4,
					},
				],
				underPerformingVideos: [
					{
						video: {
							id: "vid-2",
							title: "Old boring setup tour",
							description: "Setup",
							publishedAt: "2026-08-20T12:00:00Z",
							durationSeconds: 600,
							averageViewDurationSeconds: 192.6,
							views: 300,
							estimatedMinutesWatched: 100,
							likes: 12,
							comments: 2,
							shares: 0,
							isShort: false,
						},
						engagementRate: 0.04,
						deltaPct: -0.3,
						performance: "under",
						retentionPct: 32.1,
					},
				],
			},
			generatedAt: new Date().toISOString(),
		};

		expect(mockYtPack.channel.title).toBe("Tech Creator");
		expect(mockYtPack.insights.shortsVsLongForm.shortsAvgViews).toBe(4500);
		expect(mockYtPack.insights.topPerformingVideos[0].retentionPct).toBe(78.4);
	});
});
