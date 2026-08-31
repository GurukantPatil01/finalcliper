"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/analytics/stat-card";
import { TrendChart } from "@/components/analytics/trend-chart";
import { buildYouTubeDataPack } from "@/analytics/youtube-data-pack";
import { toDateKey } from "@/analytics/token";
import { useYouTubeAnalyticsStore } from "@/services/analytics/youtube-store";
import { RiYoutubeLine } from "react-icons/ri";

const fmtInt = (n: number | null | undefined) =>
	n === null || n === undefined ? "—" : new Intl.NumberFormat("en-US").format(n);
const fmtSigned = (n: number | null | undefined) =>
	n === null || n === undefined
		? null
		: `${n > 0 ? "+" : ""}${new Intl.NumberFormat("en-US").format(n)}`;
const fmtPct = (n: number | null | undefined) =>
	n === null || n === undefined ? "—" : `${(n * 100).toFixed(1)}%`;

function dayLabel(date: string): string {
	return date.slice(5);
}

export default function YouTubeOverviewPage() {
	const {
		hydrated,
		snapshots,
		syncing,
		connection,
		channelTitle,
		lastSyncAt,
		initialize,
		syncNow,
	} = useYouTubeAnalyticsStore();

	useEffect(() => {
		void initialize();
	}, [initialize]);

	// Auto-sync today if missing
	useEffect(() => {
		if (!hydrated || connection !== "connected" || syncing) return;
		const today = toDateKey(new Date());
		if (!snapshots.some((s) => s.date === today)) void syncNow();
	}, [hydrated, connection, syncing, snapshots, syncNow]);

	const pack = useMemo(() => {
		if (snapshots.length === 0) return null;
		try {
			return buildYouTubeDataPack(snapshots);
		} catch {
			return null;
		}
	}, [snapshots]);

	const subscriberSeries = useMemo(
		() =>
			snapshots.map((s) => ({
				label: dayLabel(s.date),
				value: s.channel.subscriberCount,
			})),
		[snapshots],
	);

	const viewsGainedSeries = useMemo(
		() =>
			pack
				? pack.rolling.viewsGainedPerDay.map((g) => ({
						label: dayLabel(g.date),
						value: g.views,
					}))
				: [],
		[pack],
	);

	const watchTimeSeries = useMemo(
		() =>
			snapshots.map((s) => ({
				label: dayLabel(s.date),
				value: s.videos.reduce((sum, v) => sum + (v.estimatedMinutesWatched || 0), 0) || null,
			})),
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
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
							<RiYoutubeLine className="size-6" />
						</div>
						<div>
							<h2 className="font-semibold">No YouTube analytics data yet</h2>
							<p className="text-muted-foreground mt-0.5 text-sm">
								{connection === "connected"
									? "Sync your YouTube channel to store the first snapshot."
									: "Connect your YouTube channel in settings to start tracking."}
							</p>
						</div>
					</div>

					<Button asChild>
						<Link href="/analytics/youtube/settings">Open YouTube Settings</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	const latest = pack?.latestDay;
	const totals = latest?.totals;
	const channel = pack?.channel;

	const watchHours = totals ? (totals.estimatedMinutesWatched / 60).toFixed(1) : "0";

	return (
		<div className="space-y-6">
			{/* Top Bar with Channel & Sync Action */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="text-muted-foreground text-xs uppercase tracking-wider font-mono">
						Channel: <span className="font-semibold text-foreground">{channelTitle || "Connected Channel"}</span>
					</div>
					{lastSyncAt && (
						<div className="text-muted-foreground text-xs">
							Last synced {new Date(lastSyncAt).toLocaleTimeString()}
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => void syncNow()}
						disabled={syncing || connection !== "connected"}
					>
						{syncing ? <Spinner className="mr-1.5 size-3.5" /> : null}
						{syncing ? "Syncing..." : "Sync now"}
					</Button>
				</div>
			</div>

			{/* Stat Cards Grid */}
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatCard
					label="Total Subscribers"
					value={fmtInt(channel?.subscriberCount)}
					delta={fmtSigned(channel?.subscriberDelta7d)}
					deltaPositive={(channel?.subscriberDelta7d || 0) >= 0}
					hint="vs. 7 days ago"
				/>
				<StatCard
					label="Total Views (Catalog)"
					value={fmtInt(totals?.views)}
					delta={fmtSigned(pack?.rolling.viewsGained7d)}
					deltaPositive={(pack?.rolling.viewsGained7d || 0) >= 0}
					hint="gained (7d)"
				/>
				<StatCard
					label="Est. Watch Time"
					value={`${watchHours} hrs`}
					delta={`${fmtInt(totals?.estimatedMinutesWatched)} min`}
					deltaPositive={true}
					hint="total minutes"
				/>
				<StatCard
					label="Tracked Videos"
					value={fmtInt(latest?.videos.length)}
					delta={`${latest?.shortsCount || 0} Shorts`}
					deltaPositive={true}
					hint={`${latest?.longFormCount || 0} Long-form`}
				/>
			</div>

			{/* Trend Charts */}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<TrendChart
					title="Subscribers Growth"
					data={subscriberSeries}
					formatValue={(v: number) => fmtInt(v)}
				/>
				<TrendChart
					title="Estimated Minutes Watched"
					data={watchTimeSeries}
					formatValue={(v: number) => `${fmtInt(v)}m`}
				/>
			</div>

			{/* Top Performing Videos Preview */}
			{pack && pack.insights.topPerformingVideos.length > 0 && (
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-semibold text-base">Top Performing Videos</h3>
							<Button variant="ghost" size="sm" asChild>
								<Link href="/analytics/youtube/videos">View all videos &rarr;</Link>
							</Button>
						</div>

						<div className="divide-y">
							{pack.insights.topPerformingVideos.slice(0, 3).map((item) => (
								<div key={item.video.id} className="py-3 flex items-center justify-between">
									<div className="flex items-center gap-3">
										{item.video.thumbnailUrl && (
											<img
												src={item.video.thumbnailUrl}
												alt={item.video.title}
												className="size-10 rounded object-cover"
											/>
										)}
										<div>
											<div className="font-medium text-sm line-clamp-1">{item.video.title}</div>
											<div className="text-muted-foreground text-xs">
												{fmtInt(item.video.views)} views • {(item.engagementRate * 100).toFixed(1)}% ER
											</div>
										</div>
									</div>

									<div className="font-mono text-xs text-emerald-500 font-medium">
										+{Math.round(item.deltaPct * 100)}% OVER
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
