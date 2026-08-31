"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/utils/ui";
import type { ReelDelta } from "@/analytics/types";

type SortKey =
	| "timestamp"
	| "views"
	| "likes"
	| "comments"
	| "saves"
	| "shares"
	| "engagementRate"
	| "deltaPct";

const COLUMNS: { key: SortKey | null; label: string }[] = [
	{ key: "timestamp", label: "Posted" },
	{ key: "views", label: "Views" },
	{ key: "likes", label: "Likes" },
	{ key: "comments", label: "Comments" },
	{ key: "saves", label: "Saves" },
	{ key: "shares", label: "Shares" },
	{ key: "engagementRate", label: "ER" },
	{ key: "deltaPct", label: "vs avg" },
];

const fmtInt = (n: number | null) =>
	n === null ? "—" : new Intl.NumberFormat("en-US").format(n);
const fmtPct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);
const fmtDelta = (n: number | null) =>
	n === null ? "—" : `${n > 0 ? "+" : ""}${(n * 100).toFixed(0)}%`;

/** Sortable per-reel table with thumbnails and performance deltas. */
export function ReelsTable({ reels }: { reels: ReelDelta[] }) {
	const [sortKey, setSortKey] = useState<SortKey>("timestamp");
	const [descending, setDescending] = useState(true);

	const sorted = useMemo(() => {
		const rows = [...reels];
		rows.sort((a, b) => {
			const pick = (delta: ReelDelta): number | string => {
				switch (sortKey) {
					case "timestamp":
						return delta.reel.timestamp;
					case "engagementRate":
						return delta.engagementRate ?? -1;
					case "deltaPct":
						return delta.deltaPct ?? -2;
					default: {
						const value = delta.reel[sortKey];
						return value ?? -1;
					}
				}
			};
			const av = pick(a);
			const bv = pick(b);
			if (av === bv) return 0;
			const cmp = av > bv ? 1 : -1;
			return descending ? cmp : -cmp;
		});
		return rows;
	}, [reels, sortKey, descending]);

	const onHeaderClick = (key: SortKey | null) => {
		if (!key) return;
		if (key === sortKey) {
			setDescending(!descending);
		} else {
			setSortKey(key);
			setDescending(true);
		}
	};

	return (
		<div className="overflow-x-auto rounded-2xl border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="min-w-[280px]">Reel</TableHead>
						{COLUMNS.map((column) => (
							<TableHead
								key={column.label}
								className={cn(column.key && "cursor-pointer select-none whitespace-nowrap")}
								onClick={() => onHeaderClick(column.key)}
							>
								{column.label}
								{sortKey === column.key ? (descending ? " ↓" : " ↑") : ""}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{sorted.length === 0 ? (
						<TableRow>
							<TableCell colSpan={COLUMNS.length + 1} className="text-muted-foreground py-10 text-center">
								No reels synced yet.
							</TableCell>
						</TableRow>
					) : (
						sorted.map((delta) => (
							<TableRow key={delta.reel.id}>
								<TableCell>
									<div className="flex items-center gap-3">
										{delta.reel.thumbnailUrl ? (
											// eslint-disable-next-line @next/next/no-img-element -- Instagram CDN URLs are runtime data, not build-time assets
											<img
												src={delta.reel.thumbnailUrl}
												alt=""
												className="h-12 w-8 rounded object-cover"
												loading="lazy"
											/>
										) : (
											<div className="bg-muted h-12 w-8 rounded" />
										)}
										<div className="max-w-[260px]">
											<p className="truncate text-sm">{delta.reel.caption.split("\n")[0] || delta.reel.id}</p>
											<p className="text-muted-foreground text-xs">
												{new Date(delta.reel.timestamp).toLocaleDateString()}
											</p>
										</div>
									</div>
								</TableCell>
								<TableCell>{fmtInt(delta.reel.views)}</TableCell>
								<TableCell>{fmtInt(delta.reel.likes)}</TableCell>
								<TableCell>{fmtInt(delta.reel.comments)}</TableCell>
								<TableCell>{fmtInt(delta.reel.saves)}</TableCell>
								<TableCell>{fmtInt(delta.reel.shares)}</TableCell>
								<TableCell>{fmtPct(delta.engagementRate)}</TableCell>
								<TableCell>
									{delta.deltaPct === null ? (
										"—"
									) : (
										<Badge
											variant="outline"
											className={cn(
												delta.performance === "over" &&
													"border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
												delta.performance === "under" &&
													"border-red-500/40 text-red-600 dark:text-red-400",
											)}
										>
											{fmtDelta(delta.deltaPct)}
										</Badge>
									)}
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
