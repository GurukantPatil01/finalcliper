"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { YouTubeVideoDelta } from "@/analytics/youtube-types";
import { ExternalLink, Film, Search, Sparkles } from "lucide-react";

interface VideosTableProps {
	videos: YouTubeVideoDelta[];
}

const fmtInt = (n: number | null | undefined) =>
	n === null || n === undefined ? "—" : new Intl.NumberFormat("en-US").format(n);
const fmtPct = (n: number | null | undefined) =>
	n === null || n === undefined ? "—" : `${(n * 100).toFixed(1)}%`;

export function YouTubeVideosTable({ videos }: VideosTableProps) {
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<"all" | "shorts" | "long">("all");
	const [sortBy, setSortBy] = useState<"views" | "likes" | "er" | "retention">("views");

	const filtered = useMemo(() => {
		let result = [...videos];

		if (filter === "shorts") {
			result = result.filter((v) => v.video.isShort);
		} else if (filter === "long") {
			result = result.filter((v) => !v.video.isShort);
		}

		if (query.trim()) {
			const q = query.toLowerCase();
			result = result.filter(
				(v) =>
					v.video.title.toLowerCase().includes(q) ||
					v.video.description.toLowerCase().includes(q),
			);
		}

		result.sort((a, b) => {
			if (sortBy === "views") return b.video.views - a.video.views;
			if (sortBy === "likes") return b.video.likes - a.video.likes;
			if (sortBy === "er") return b.engagementRate - a.engagementRate;
			if (sortBy === "retention") return b.retentionPct - a.retentionPct;
			return 0;
		});

		return result;
	}, [videos, query, filter, sortBy]);

	return (
		<div className="space-y-4">
			{/* Controls Bar */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative max-w-sm flex-1">
					<Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
					<Input
						placeholder="Search videos by title..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="pl-9 text-sm"
					/>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex rounded-md border p-1 text-xs">
						<button
							type="button"
							onClick={() => setFilter("all")}
							className={`rounded px-2.5 py-1 ${
								filter === "all" ? "bg-muted font-medium" : "text-muted-foreground"
							}`}
						>
							All ({videos.length})
						</button>
						<button
							type="button"
							onClick={() => setFilter("shorts")}
							className={`rounded px-2.5 py-1 ${
								filter === "shorts" ? "bg-muted font-medium" : "text-muted-foreground"
							}`}
						>
							Shorts
						</button>
						<button
							type="button"
							onClick={() => setFilter("long")}
							className={`rounded px-2.5 py-1 ${
								filter === "long" ? "bg-muted font-medium" : "text-muted-foreground"
							}`}
						>
							Long-form
						</button>
					</div>

					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value as any)}
						className="bg-background text-foreground h-9 rounded-md border px-3 text-xs"
					>
						<option value="views">Sort by Views</option>
						<option value="likes">Sort by Likes</option>
						<option value="er">Sort by Engagement</option>
						<option value="retention">Sort by Retention</option>
					</select>
				</div>
			</div>

			{/* Video Table */}
			<div className="overflow-x-auto rounded-lg border">
				<table className="w-full text-left text-sm">
					<thead className="bg-muted/50 border-b font-mono text-xs uppercase">
						<tr>
							<th className="p-3">Video / Title</th>
							<th className="p-3">Format</th>
							<th className="p-3 text-right">Views</th>
							<th className="p-3 text-right">Likes</th>
							<th className="p-3 text-right">Watch Time</th>
							<th className="p-3 text-right">Engagement</th>
							<th className="p-3 text-right">Performance</th>
						</tr>
					</thead>
					<tbody className="divide-y">
						{filtered.map((item) => {
							const { video, engagementRate, deltaPct, performance, retentionPct } = item;
							const watchHours = (video.estimatedMinutesWatched / 60).toFixed(1);

							return (
								<tr key={video.id} className="hover:bg-muted/30 transition-colors">
									<td className="p-3">
										<div className="flex items-center gap-3">
											{video.thumbnailUrl ? (
												<img
													src={video.thumbnailUrl}
													alt={video.title}
													className="size-12 rounded object-cover"
												/>
											) : (
												<div className="bg-muted flex size-12 items-center justify-center rounded">
													<Film className="size-5 text-neutral-400" />
												</div>
											)}
											<div className="max-w-md">
												<a
													href={`https://youtube.com/watch?v=${video.id}`}
													target="_blank"
													rel="noreferrer"
													className="hover:text-primary flex items-center gap-1 font-medium line-clamp-1"
												>
													<span>{video.title}</span>
													<ExternalLink className="size-3 shrink-0 opacity-60" />
												</a>
												<div className="text-muted-foreground mt-0.5 text-xs">
													{new Date(video.publishedAt).toLocaleDateString()} • {video.durationSeconds}s
												</div>
											</div>
										</div>
									</td>

									<td className="p-3">
										{video.isShort ? (
											<Badge variant="outline" className="border-red-500/40 text-red-500 text-[10px]">
												SHORTS
											</Badge>
										) : (
											<Badge variant="outline" className="text-[10px]">
												VIDEO
											</Badge>
										)}
									</td>

									<td className="p-3 text-right font-mono font-medium">
										{fmtInt(video.views)}
									</td>

									<td className="p-3 text-right font-mono text-neutral-400">
										{fmtInt(video.likes)}
									</td>

									<td className="p-3 text-right font-mono text-neutral-400">
										{watchHours}h
									</td>

									<td className="p-3 text-right font-mono font-medium">
										{fmtPct(engagementRate)}
									</td>

									<td className="p-3 text-right">
										{performance === "over" ? (
											<Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[10px]">
												+{Math.round(deltaPct * 100)}% OVER
											</Badge>
										) : performance === "under" ? (
											<Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[10px]">
												{Math.round(deltaPct * 100)}% UNDER
											</Badge>
										) : (
											<Badge variant="outline" className="text-[10px]">
												AVERAGE
											</Badge>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
