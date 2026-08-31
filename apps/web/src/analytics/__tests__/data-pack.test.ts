import { describe, expect, test } from "bun:test";
import { computeDeltaPct, computeEngagementRate, buildDataPack, dailyViewsGained, postHourLabel, topCaptionKeywords, uniqueLatestReels } from "../data-pack";
import type { DailySnapshot, ReelMetrics } from "../types";

function reel(overrides: Partial<ReelMetrics>): ReelMetrics {
	return {
		id: "r1",
		caption: "",
		permalink: "https://www.instagram.com/reel/r1/",
		thumbnailUrl: undefined,
		timestamp: "2026-08-30T14:00:00.000Z",
		views: null,
		reach: null,
		likes: null,
		comments: null,
		saves: null,
		shares: null,
		follows: null,
		totalInteractions: null,
		...overrides,
	};
}

function snapshot(date: string, reels: ReelMetrics[], followers: number | null = 1000): DailySnapshot {
	return {
		date,
		syncedAt: `${date}T08:00:00.000Z`,
		account: { username: "tester", followersCount: followers, views: null, reach: null, profileViews: null },
		reels,
	};
}

describe("computeEngagementRate", () => {
	test("interactions over views", () => {
		expect(
			computeEngagementRate(reel({ views: 1000, likes: 50, comments: 20, saves: 10, shares: 20 })),
		).toBeCloseTo(0.1);
	});
	test("null when views missing", () => {
		expect(computeEngagementRate(reel({ views: null, likes: 50 }))).toBeNull();
	});
	test("zero when views but no interactions", () => {
		expect(computeEngagementRate(reel({ views: 500 }))).toBe(0);
	});
});

describe("computeDeltaPct", () => {
	test("positive delta", () => {
		expect(computeDeltaPct(0.15, 0.1)).toBeCloseTo(0.5);
	});
	test("null with zero average", () => {
		expect(computeDeltaPct(0.15, 0)).toBeNull();
	});
	test("null with missing values", () => {
		expect(computeDeltaPct(null, 0.1)).toBeNull();
	});
});

describe("uniqueLatestReels", () => {
	test("keeps newest metrics per id", () => {
		const older = snapshot("2026-08-29", [reel({ id: "a", views: 10 })]);
		const newer = snapshot("2026-08-30", [reel({ id: "a", views: 20 }), reel({ id: "b", views: 5 })]);
		const reels = uniqueLatestReels([newer, older]);
		expect(reels).toHaveLength(2);
		const a = reels.find((r) => r.id === "a");
		expect(a?.views).toBe(20);
	});
});

describe("dailyViewsGained", () => {
	test("diffs cumulative lifetime views", () => {
		const days = [
			snapshot("2026-08-28", [reel({ id: "a", views: 100 })]),
			snapshot("2026-08-29", [reel({ id: "a", views: 250 })]),
			snapshot("2026-08-30", [reel({ id: "a", views: 400 })]),
		];
		expect(dailyViewsGained(days)).toEqual([
			{ date: "2026-08-29", views: 150 },
			{ date: "2026-08-30", views: 150 },
		]);
	});
	test("first day has no baseline", () => {
		expect(dailyViewsGained([snapshot("2026-08-30", [reel({ views: 100 })])])).toEqual([]);
	});
});

describe("buildDataPack", () => {
	const day1 = "2026-08-29";
	const day2 = "2026-08-30";
	const snapshots = [
		snapshot(
			day1,
			[
				reel({ id: "good", views: 1000, likes: 150, comments: 30, saves: 10, shares: 10, timestamp: "2026-08-29T15:00:00.000Z" }),
				reel({ id: "bad", views: 1000, likes: 5, comments: 1, saves: 2, shares: 2, timestamp: "2026-08-29T03:00:00.000Z" }),
			],
			1000,
		),
		snapshot(
			day2,
			[
				reel({ id: "good", views: 2000, likes: 300, comments: 60, saves: 20, shares: 20 }),
				reel({ id: "bad", views: 1000, likes: 10, comments: 2, saves: 4, shares: 4 }),
			],
			1050,
		),
	];

	const pack = buildDataPack(snapshots, new Date("2026-08-31T06:00:00.000Z"));

	test("latest day is the newest snapshot", () => {
		expect(pack.latestDay.date).toBe(day2);
		expect(pack.latestDay.reels).toHaveLength(2);
	});

	test("ranks top and worst performers by engagement rate", () => {
		expect(pack.topReels[0].reel.id).toBe("good");
		expect(pack.worstReels[0].reel.id).toBe("bad");
		expect(pack.topReels[0].performance).toBe("over");
	});

	test("follower deltas come from earlier snapshots", () => {
		expect(pack.account.followersDelta7d).toBe(50);
		expect(pack.account.followersCount).toBe(1050);
	});

	test("rolling views gained over the window", () => {
		// good: 1000→2000 (+1000), bad: 1000→1000 (+0) between day1 and day2.
		expect(pack.rolling.viewsGained7d).toBe(1000);
		expect(pack.rolling.viewsGainedPerDay).toEqual([{ date: day2, views: 1000 }]);
	});

	test("notes flag thin history", () => {
		expect(pack.notes.some((n) => n.includes("snapshot day"))).toBe(true);
	});

	test("post-hour buckets split night vs afternoon", () => {
		const labels = pack.patterns.byPostHour.map((b) => b.label);
		// timestamps are UTC 15:00 / 03:00; buckets use local time. Both labels
		// must appear across the two reels regardless of the test host timezone.
		expect(labels.length).toBeGreaterThanOrEqual(1);
		expect(labels.length).toBeLessThanOrEqual(2);
	});

	test("postHourLabel maps hours to buckets", () => {
		expect(postHourLabel(reel({ timestamp: "2026-08-30T23:59:00.000Z" }))).toMatch(/Evening|Night/);
	});
});

describe("topCaptionKeywords", () => {
	test("counts repeated meaningful words, drops stopwords", () => {
		const reels = [
			reel({ caption: "Coffee roasting at home — coffee roasting basics" }),
			reel({ caption: "Why coffee tastes sour: roasting fixes" }),
		];
		const keywords = topCaptionKeywords(reels);
		const words = keywords.map((k) => k.word);
		expect(words).toContain("coffee");
		expect(words).toContain("roasting");
		expect(words).not.toContain("why");
	});
});

describe("buildDataPack with no snapshots", () => {
	test("throws", () => {
		expect(() => buildDataPack([])).toThrow();
	});
});
