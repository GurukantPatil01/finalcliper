import { describe, expect, it } from "bun:test";
import {
	buildYouTubeAuthorizeUrl,
	verifyYouTubeState,
} from "../youtube-oauth";
import { buildYouTubeDataPack } from "../youtube-data-pack";
import type { YouTubeDailySnapshot } from "../youtube-types";

describe("YouTube OAuth helpers", () => {
	const secret = "test-google-client-secret-12345";

	it("builds valid authorize url with required scopes", () => {
		const url = buildYouTubeAuthorizeUrl({
			clientId: "my-client-id.apps.googleusercontent.com",
			clientSecret: secret,
			redirectUri: "http://localhost:3000/api/youtube/oauth/callback",
			returnTo: "/analytics/youtube/settings",
		});

		expect(url).toContain("accounts.google.com");
		expect(url).toContain("client_id=my-client-id.apps.googleusercontent.com");
		expect(url).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fyoutube%2Foauth%2Fcallback");
		expect(url).toContain("scope=");
	});

	it("verifies and extracts returnTo safely", () => {
		const url = buildYouTubeAuthorizeUrl({
			clientId: "my-client-id",
			clientSecret: secret,
			redirectUri: "http://localhost:3000/api/youtube/oauth/callback",
			returnTo: "/analytics/youtube/settings",
		});

		const state = new URL(url).searchParams.get("state")!;
		expect(state).toBeTruthy();

		const result = verifyYouTubeState(state, secret);
		expect(result.valid).toBe(true);
		expect(result.returnTo).toBe("/analytics/youtube/settings");
	});

	it("rejects invalid or tampered state", () => {
		const result = verifyYouTubeState("fake.state.tampered", secret);
		expect(result.valid).toBe(false);
	});
});

describe("YouTube Data Pack Aggregation", () => {
	const mockSnapshot: YouTubeDailySnapshot = {
		date: "2026-08-31",
		syncedAt: "2026-08-31T10:00:00Z",
		channel: {
			channelId: "UC12345",
			title: "Tech Creator",
			subscriberCount: 15400,
			totalViews: 450000,
			totalVideos: 24,
		},
		videos: [
			{
				id: "v1",
				title: "AI Video Editing in Rust",
				description: "#Shorts quick demo",
				publishedAt: "2026-08-30T12:00:00Z",
				isShort: true,
				durationSeconds: 45,
				views: 12000,
				likes: 850,
				comments: 45,
				shares: 30,
				estimatedMinutesWatched: 5400,
				averageViewDurationSeconds: 27,
				averageViewPercentage: 60,
				subscribersGained: 48,
			},
			{
				id: "v2",
				title: "Full Video Editor Architecture Breakdown",
				description: "In-depth guide",
				publishedAt: "2026-08-28T12:00:00Z",
				isShort: false,
				durationSeconds: 600,
				views: 5000,
				likes: 400,
				comments: 80,
				shares: 50,
				estimatedMinutesWatched: 25000,
				averageViewDurationSeconds: 300,
				averageViewPercentage: 50,
				subscribersGained: 25,
			},
		],
	};

	it("aggregates totals and splits Shorts vs Long-form", () => {
		const pack = buildYouTubeDataPack([mockSnapshot]);

		expect(pack.channel.title).toBe("Tech Creator");
		expect(pack.latestDay.totals.views).toBe(17000);
		expect(pack.latestDay.shortsCount).toBe(1);
		expect(pack.latestDay.longFormCount).toBe(1);
		expect(pack.insights.shortsVsLongForm.shortsAvgViews).toBe(12000);
		expect(pack.insights.shortsVsLongForm.longFormAvgViews).toBe(5000);
		expect(pack.insights.topPerformingVideos.length).toBe(2);
	});
});
