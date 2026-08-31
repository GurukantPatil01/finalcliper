"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ReportViewer } from "@/components/analytics/report-viewer";
import { toDateKey } from "@/analytics/token";
import { useAnalyticsStore } from "@/services/analytics/store";
import type { StoredReport } from "@/analytics/types";

export default function AnalyticsReportsPage() {
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
	} = useAnalyticsStore();
	const [selectedId, setSelectedId] = useState<string | null>(null);

	useEffect(() => {
		void initialize();
	}, [initialize]);

	// On-open behavior: refresh data for a new day, then auto-generate today's
	// report once (the "morning agent" without any server cron).
	useEffect(() => {
		if (!hydrated || connection !== "connected") return;
		const today = toDateKey(new Date());
		if (!snapshots.some((s) => s.date === today)) {
			void syncNow().then(() => void ensureTodayReport());
		} else {
			void ensureTodayReport();
		}
		// Runs once per mount + connection change; re-running on every snapshot
		// change would loop report generation.
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
					{reports.length} report{reports.length === 1 ? "" : "s"} stored locally
					{snapshots.length === 0 ? " — sync data first to enable generation" : ""}
				</p>
				<Button
					size="sm"
					disabled={generating || snapshots.length === 0}
					onClick={() => void generateReportNow()}
				>
					{generating ? <Spinner className="size-4" /> : null}
					Generate report now
				</Button>
			</div>

			{error ? (
				<p className="border-destructive/40 text-destructive rounded-xl border px-4 py-3 text-sm">
					{error}
				</p>
			) : null}

			{reports.length === 0 ? (
				<Card>
					<CardContent className="text-muted-foreground p-8 text-sm">
						No reports yet. Sync your account, then generate one — reports work with or
						without an LLM (rule-based fallback).
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
								className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
									report.id === selected?.id ? "bg-muted font-medium" : "hover:bg-muted/50"
								}`}
							>
								<span className="block">{report.forDate}</span>
								<span className="text-muted-foreground block text-xs">
									{report.source} · {new Date(report.createdAt).toLocaleTimeString()}
								</span>
							</button>
						))}
					</nav>
					<Card>
						<CardContent className="p-6">
							{selected ? <ReportViewer report={selected} /> : null}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
