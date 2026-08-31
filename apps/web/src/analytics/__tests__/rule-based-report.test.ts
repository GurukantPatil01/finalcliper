import { describe, expect, test } from "bun:test";
import { buildRuleBasedReport } from "../rule-based-report";
import { buildDataPack } from "../data-pack";
import type { DailySnapshot, ReelMetrics } from "../types";

function reel(overrides: Partial<ReelMetrics>): ReelMetrics {
	return {
		id: "r1",
		caption: "",
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

const snapshots: DailySnapshot[] = [
	{
		date: "2026-08-29",
		syncedAt: "2026-08-29T08:00:00.000Z",
		account: { username: "tester", followersCount: 1000, views: null, reach: null, profileViews: null },
		reels: [
			reel({ id: "winner", caption: "Morning coffee routine\nfull recipe in comments", views: 5000, likes: 500, comments: 80, saves: 100, shares: 70, follows: 25 }),
			reel({ id: "flop", caption: "quick update", views: 500, likes: 4, comments: 1, saves: 0, shares: 1, follows: 0 }),
		],
	},
	{
		date: "2026-08-30",
		syncedAt: "2026-08-30T08:00:00.000Z",
		account: { username: "tester", followersCount: 1100, views: null, reach: null, profileViews: null },
		reels: [
			reel({ id: "winner", caption: "Morning coffee routine\nfull recipe in comments", views: 6000, likes: 600, comments: 95, saves: 120, shares: 80, follows: 30 }),
			reel({ id: "flop", caption: "quick update", views: 600, likes: 5, comments: 1, saves: 0, shares: 1, follows: 0 }),
		],
	},
];

describe("buildRuleBasedReport", () => {
	const report = buildRuleBasedReport(buildDataPack(snapshots, new Date("2026-08-31T06:00:00.000Z")));

	test("has exactly the three required sections", () => {
		expect(report).toContain("## Yesterday");
		expect(report).toContain("## What's working");
		expect(report).toContain("## Actions for today");
		const headings = report.match(/^## .*/gm) ?? [];
		expect(headings).toHaveLength(3);
	});

	test("cites concrete numbers", () => {
		expect(report).toContain("@tester");
		expect(report).toContain("6,000"); // winner's latest views
	});

	test("actions are numbered and capped at five", () => {
		const actions = report.match(/^\d+\. /gm) ?? [];
		expect(actions.length).toBeGreaterThanOrEqual(3);
		expect(actions.length).toBeLessThanOrEqual(5);
	});

	test("no-reel day still produces the three sections", () => {
		const empty = buildRuleBasedReport(
			buildDataPack(
				[{ ...snapshots[0], date: "2026-08-30", reels: [] }],
				new Date("2026-08-31T06:00:00.000Z"),
			),
		);
		expect(empty).toContain("## Yesterday");
		expect(empty).toContain("No new reels");
	});

	test("flags rule-based provenance", () => {
		expect(report).toContain("rule-based");
	});
});
