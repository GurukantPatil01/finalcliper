"use client";

import { useEffect, useMemo } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ReelsTable } from "@/components/analytics/reels-table";
import { reelDeltas } from "@/analytics/data-pack";
import { useAnalyticsStore } from "@/services/analytics/store";

export default function AnalyticsReelsPage() {
	const { hydrated, snapshots, initialize } = useAnalyticsStore();

	useEffect(() => {
		void initialize();
	}, [initialize]);

	const deltas = useMemo(() => (hydrated ? reelDeltas(snapshots) : []), [hydrated, snapshots]);

	if (!hydrated) {
		return (
			<div className="flex items-center justify-center py-24">
				<Spinner className="size-6" />
			</div>
		);
	}

	const over = deltas.filter((d) => d.performance === "over").length;
	const under = deltas.filter((d) => d.performance === "under").length;

	return (
		<div className="space-y-4">
			<p className="text-muted-foreground text-sm">
				{deltas.length} reels · deltas compare each reel&apos;s engagement rate against
				your account average ({over} over-performer{over === 1 ? "" : "s"},{" "}
				{under} under-performer{under === 1 ? "" : "s"}).
			</p>
			<ReelsTable reels={deltas} />
		</div>
	);
}
