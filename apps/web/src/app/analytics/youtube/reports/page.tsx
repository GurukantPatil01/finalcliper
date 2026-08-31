"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ReportViewer } from "@/components/analytics/report-viewer";
import { toDateKey } from "@/analytics/token";
import { useYouTubeAnalyticsStore } from "@/services/analytics/youtube-store";
import type { StoredReport } from "@/analytics/types";
import { Sparkles } from "lucide-react";

export default function YouTubeReportsPage() {
	const {
		hydrated,
		snapshots,
		reports,
		generating,
		error,
		connection,
		initialize,
		syncNow,
		generateReportNow,
		ensureTodayReport,
	} = useYouTubeAnalyticsStore();
	const [selectedId, setSelectedId] = useState<string | null>(null);

	useEffect(() => {
		void initialize();
	}, [initialize]);

	useEffect(() => {
		if (!hydrated || connection !== "connected") return;
		const today = toDateKey(new Date());
		if (!snapshots.some((s) => s.date === today)) {
			void syncNow().then(() => void ensureTodayReport());
		} else {
			void ensureTodayReport();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hydrated, connection]);

	useEffect(() => {
		if (reports.length > 0 && selectedId === null) {
			setSelectedId(reports[0].id);
		}
	}, [reports, selectedId]);

	const selected: StoredReport | undefined =
		reports.find((r) => r.id === selectedId) ?? reports[0];

	if (!hydrated) {
		return (
			<div className="flex items-center justify-center py-24">
				<Spinner className="size-6" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-muted-foreground text-sm">
					{reports.length} report{reports.length === 1 ? "" : "s"} stored locally in IndexedDB
					{snapshots.length === 0 ? " — sync data first to enable generation" : ""}
				</p>
				<Button
					size="sm"
					disabled={generating || snapshots.length === 0}
					onClick={() => void generateReportNow()}
				>
					{generating ? <Spinner className="mr-1.5 size-3.5" /> : <Sparkles className="mr-1.5 size-3.5" />}
					{generating ? "Generating..." : "Generate report now"}
				</Button>
			</div>

			{error && (
				<p className="border-destructive/40 text-destructive rounded-xl border px-4 py-3 text-sm">
					{error}
				</p>
			)}

			{reports.length === 0 ? (
				<Card>
					<CardContent className="text-muted-foreground p-8 text-sm">
						No reports yet. Sync your YouTube channel, then generate a report — works with
						Gemini or rule-based offline synthesis.
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
					<nav className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto rounded-2xl border p-2">
						{reports.map((report) => (
							<button
								key={report.id}
								type="button"
								onClick={() => setSelectedId(report.id)}
								className={`rounded-lg p-3 text-left transition-colors ${
									report.id === selected?.id ? "bg-muted font-medium" : "hover:bg-muted/50"
								}`}
							>
								<div className="flex items-center justify-between text-xs">
									<span className="font-mono">{report.forDate}</span>
									<span className="text-muted-foreground capitalize text-[10px]">
										{report.source}
									</span>
								</div>
								<div className="text-muted-foreground mt-1 line-clamp-1 text-xs">
									{report.markdown.split("\n")[0]?.replace(/^#*\s*/, "") || "YouTube Report"}
								</div>
							</button>
						))}
					</nav>

					<div className="min-w-0">
						{selected ? (
							<ReportViewer report={selected} />
						) : (
							<div className="text-muted-foreground flex h-64 items-center justify-center rounded-2xl border">
								Select a report to view
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
