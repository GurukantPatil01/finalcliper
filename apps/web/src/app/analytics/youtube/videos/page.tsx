"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { YouTubeVideosTable } from "@/components/analytics/youtube/videos-table";
import { buildYouTubeDataPack } from "@/analytics/youtube-data-pack";
import { useYouTubeAnalyticsStore } from "@/services/analytics/youtube-store";

export default function YouTubeVideosPage() {
	const { hydrated, snapshots, initialize } = useYouTubeAnalyticsStore();

	useEffect(() => {
		void initialize();
	}, [initialize]);

	const pack = useMemo(() => {
		if (snapshots.length === 0) return null;
		try {
			return buildYouTubeDataPack(snapshots);
		} catch {
			return null;
		}
	}, [snapshots]);

	if (!hydrated) {
		return (
			<div className="flex items-center justify-center py-24">
				<Spinner className="size-6" />
			</div>
		);
	}

	if (!pack || pack.latestDay.videos.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-start gap-4 p-8">
					<div>
						<h2 className="font-semibold">No videos synced yet</h2>
						<p className="text-muted-foreground mt-1 text-sm">
							Sync your YouTube channel to fetch your latest uploads and analytics.
						</p>
					</div>
					<Button asChild>
						<Link href="/analytics/youtube/settings">Open YouTube Settings</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-lg font-semibold">Videos & Shorts</h2>
				<p className="text-muted-foreground text-sm">
					Detailed breakdown of your uploaded videos, views, watch time, and performance.
				</p>
			</div>

			<YouTubeVideosTable videos={pack.latestDay.videos} />
		</div>
	);
}
