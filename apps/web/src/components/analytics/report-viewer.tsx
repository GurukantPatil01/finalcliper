import Link from "next/link";
import { ReactMarkdownWrapper } from "@/components/ui/react-markdown-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { StoredReport } from "@/analytics/types";

function sourceBadgeVariant(source: string) {
	if (source === "rule-based") return "secondary" as const;
	return "default" as const;
}

/** Full report text (markdown) with its provenance + basis date. */
export function ReportViewer({ report }: { report: StoredReport }) {
	const snapshotDays =
		(report.dataPack as any)?.coverage?.snapshotDays ??
		(report.dataPack as any)?.rolling?.viewsGainedPerDay?.length ??
		null;

	return (
		<article className="space-y-4">
			<header className="flex flex-wrap items-center justify-between gap-2 text-sm border-b pb-3">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={sourceBadgeVariant(report.source)}>{report.source}</Badge>
					<span className="text-muted-foreground">
						{new Date(report.createdAt).toLocaleString()} · based on the{" "}
						{report.forDate} snapshot
						{snapshotDays ? ` · ${snapshotDays} day(s) of data` : ""}
					</span>
				</div>
				<Button asChild size="sm" className="gap-1.5 h-8 text-xs font-semibold">
					<Link href="/projects">
						<HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
						Auto-Produce in Editor
					</Link>
				</Button>
			</header>
			<div className="prose prose-h2:mt-0 prose-h2:mb-3 prose-h2:font-semibold prose-li:my-1 dark:prose-invert max-w-none">
				<ReactMarkdownWrapper>{report.markdown}</ReactMarkdownWrapper>
			</div>
		</article>
	);
}
