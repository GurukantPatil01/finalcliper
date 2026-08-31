"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/analytics/stat-card";
import { TrendChart } from "@/components/analytics/trend-chart";
import { buildDataPack, dailyViewsGained } from "@/analytics/data-pack";
import { toDateKey } from "@/analytics/token";
import { useAnalyticsStore } from "@/services/analytics/store";

const fmtInt = (n: number | null) =>
	n === null ? "—" : new Intl.NumberFormat("en-US").format(n);
const fmtSigned = (n: number | null) =>
	n === null ? null : `${n > 0 ? "+" : ""}${new Intl.NumberFormat("en-US").format(n)}`;
const fmtPct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(2)}%`);

function dayLabel(date: string): string {
	return date.slice(5); // MM-DD keeps axis labels compact
}

export default function AnalyticsOverviewPage() {
	const {
		hydrated,
		snapshots,
		syncing,
		error,
		connection,
		username,
		lastSyncAt,
		initialize,
		syncNow,
	} = useAnalyticsStore();

	useEffect(() => {
		void initialize();
	}, [initialize]);

	// On-open sync: pull fresh data when the day's snapshot is missing.
	useEffect(() => {
		if (!hydrated || connection !== "connected" || syncing) return;
		const today = toDateKey(new Date());
		if (!snapshots.some((s) => s.date === today)) void syncNow();
	}, [hydrated, connection, syncing, snapshots, syncNow]);

	const pack = useMemo(() => {
		if (snapshots.length === 0) return null;
		try {
			return buildDataPack(snapshots);
		} catch {
			return null;
		}
	}, [snapshots]);

	const followersSeries = useMemo(
		() =>
			snapshots.map((s) => ({
				label: dayLabel(s.date),
				value: s.account.followersCount,
			})),
		[snapshots],
	);
	const likesSeries = useMemo(
		() =>
			snapshots.map((s) => ({
				label: dayLabel(s.date),
				value: s.reels.reduce((sum, reel) => sum + (reel.likes ?? 0), 0),
			})),
		[snapshots],
	);
	const viewsSeries = useMemo(() => {
		const gains = dailyViewsGained(snapshots);
		if (gains.length > 0) {
			return gains.map((g) => ({ label: dayLabel(g.date), value: g.views }));
		}
		return snapshots.map((s) => ({
			label: dayLabel(s.date),
			value: s.reels.reduce((sum, r) => sum + (r.views ?? 0), 0),
		}));
	}, [snapshots]);

	const engagementSeries = useMemo(
		() =>
			snapshots.map((s) => {
				const views = s.reels.reduce((sum, r) => sum + (r.views ?? 0), 0);
				const interactions = s.reels.reduce(
					(sum, r) =>
						sum + (r.likes ?? 0) + (r.comments ?? 0) + (r.saves ?? 0) + (r.shares ?? 0),
					0,
				);
				return {
					label: dayLabel(s.date),
					value: views > 0 ? interactions / views : interactions > 0 ? 0.05 : 0,
				};
			}),
		[snapshots],
	);

	if (!hydrated) {
		return (
			<div className="flex items-center justify-center py-24">
				<Spinner className="size-6" />
			</div>
		);
	}

	if (snapshots.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-start gap-4 p-8">
					<div>
						<h2 className="font-semibold">No analytics data yet</h2>
						<p className="text-muted-foreground mt-1 text-sm">
							{connection === "connected"
								? "Sync your account to store the first daily snapshot — reports unlock after that."
								: "Connect Instagram first, then sync to start building history."}
						</p>
					</div>
					<Button asChild>
						<Link href="/analytics/settings">Open settings</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-muted-foreground text-sm">
					{username ? `@${username} · ` : ""}
					Last sync {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "—"}
					{syncing ? " · syncing…" : ""}
				</p>
				<Button variant="outline" size="sm" disabled={syncing} onClick={() => void syncNow()}>
					{syncing ? <Spinner className="size-4" /> : null}
					Sync now
				</Button>
			</div>

			{error ? (
				<p className="border-destructive/40 text-destructive rounded-xl border px-4 py-3 text-sm">
					{error}
				</p>
			) : null}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Followers"
					value={fmtInt(pack?.account.followersCount ?? null)}
					delta={pack ? fmtSigned(pack.account.followersDelta7d) : null}
					deltaPositive={(pack?.account.followersDelta7d ?? 0) >= 0}
					hint="7-day change"
				/>
				<StatCard
					label="Views gained (7d)"
					value={fmtInt(pack?.rolling.viewsGained7d ?? null)}
					hint={`${fmtInt(pack?.rolling.viewsGained30d ?? null)} in 30d`}
				/>
				<StatCard
					label="Engagement rate (7d)"
					value={fmtPct(pack?.rolling.engagementRate7d ?? null)}
					hint={`30d: ${fmtPct(pack?.rolling.engagementRate30d ?? null)}`}
				/>
				<StatCard
					label="Lifetime reel views"
					value={fmtInt(snapshots[snapshots.length - 1].reels.reduce((sum, r) => sum + (r.views ?? 0), 0))}
					hint={`${pack?.coverage.reels ?? 0} reels tracked`}
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<TrendChart title="Views gained per day" data={viewsSeries} />
				<TrendChart title="Followers" data={followersSeries} />
				<TrendChart title="Lifetime likes" data={likesSeries} />
				<TrendChart
					title="Engagement rate per day"
					data={engagementSeries}
					formatValue={(v) => `${(v * 100).toFixed(1)}%`}
				/>
			</div>
		</div>
	);
}
