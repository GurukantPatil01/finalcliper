"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useYouTubeAnalyticsStore } from "@/services/analytics/youtube-store";
import { clearYouTubeData } from "@/services/analytics/db";
import { saveYouTubeConnection } from "@/services/youtube/connection";
import { RiYoutubeLine } from "react-icons/ri";

const CONNECT_URL = "/api/youtube/oauth/start?returnTo=/analytics/youtube/settings";

function YouTubeSettingsInner() {
	const searchParams = useSearchParams();
	const {
		hydrated,
		connection,
		channelTitle,
		avatarUrl,
		tokenExpiresAt,
		lastSyncAt,
		snapshots,
		reports,
		autoReport,
		syncing,
		generating,
		initialize,
		pickupOAuthHandoff,
		syncNow,
		generateReportNow,
		setAutoReport,
		disconnect,
	} = useYouTubeAnalyticsStore();
	const [initializing, setInitializing] = useState(true);
	const [manualToken, setManualToken] = useState("");
	const [manualChannelTitle, setManualChannelTitle] = useState("");
	const [showManual, setShowManual] = useState(false);

	const connectParam = searchParams.get("connected");
	const errorParam = searchParams.get("error");

	useEffect(() => {
		void initialize().then(async () => {
			if (connectParam === "1") {
				await pickupOAuthHandoff();
				toast.success("YouTube channel connected successfully!");
				void syncNow();
			}
			setInitializing(false);
		});
	}, [initialize, pickupOAuthHandoff, connectParam, syncNow]);

	useEffect(() => {
		if (errorParam) {
			toast.error(`Connection error: ${errorParam}`);
		}
	}, [errorParam]);

	if (!hydrated || initializing) {
		return (
			<div className="flex items-center justify-center py-24">
				<Spinner className="size-6" />
			</div>
		);
	}

	const handleSaveManualToken = () => {
		if (!manualToken.trim()) {
			toast.error("Please enter a valid Google/YouTube access token.");
			return;
		}
		const connection = {
			accessToken: manualToken.trim(),
			expiresAt: Date.now() + 86400 * 30 * 1000,
			channelId: "manual_channel",
			channelTitle: manualChannelTitle.trim() || "YouTube Channel",
		};
		saveYouTubeConnection(connection);
		toast.success("YouTube access token saved!");
		setManualToken("");
		void syncNow();
	};

	return (
		<div className="space-y-6">
			{/* Connection Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<RiYoutubeLine className="size-5 text-red-500" />
						<span>YouTube Channel Connection</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					{connection === "connected" ? (
						<>
							<div className="flex items-center gap-3">
								{avatarUrl && (
									<img
										src={avatarUrl}
										alt={channelTitle || "Channel"}
										className="size-10 rounded-full object-cover border"
									/>
								)}
								<div>
									<div className="font-semibold text-base">
										Connected as {channelTitle || "YouTube Channel"}
									</div>
									<div className="text-muted-foreground text-xs">
										OAuth tokens are stored locally in your browser and auto-renewed.
									</div>
								</div>
							</div>

							<div className="flex flex-wrap gap-2 pt-2">
								<Button size="sm" disabled={syncing} onClick={() => void syncNow()}>
									{syncing ? <Spinner className="mr-1.5 size-3.5" /> : null}
									{syncing ? "Syncing..." : "Sync now"}
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={generating || snapshots.length === 0}
									onClick={() => void generateReportNow()}
								>
									{generating ? <Spinner className="mr-1.5 size-3.5" /> : null}
									{generating ? "Generating..." : "Generate report now"}
								</Button>
								<Button
									size="sm"
									variant="destructive"
									onClick={() => {
										disconnect();
										toast.success("YouTube disconnected");
									}}
								>
									Disconnect
								</Button>
							</div>
						</>
					) : (
						<>
							<p className="text-muted-foreground">
								Connect your Google / YouTube account to track views, watch time, Shorts
								retention, and receive daily strategic growth reports.
							</p>
							<div className="flex flex-wrap items-center gap-3">
								<Button asChild>
									<a href={CONNECT_URL} className="flex items-center gap-2">
										<RiYoutubeLine className="size-4" />
										<span>Connect YouTube Channel</span>
									</a>
								</Button>

								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowManual(!showManual)}
								>
									{showManual ? "Hide Manual Token" : "Enter Token Manually"}
								</Button>
							</div>

							{showManual && (
								<div className="mt-4 rounded-lg border bg-muted/20 p-4 space-y-3">
									<div className="font-medium text-xs">Direct OAuth Access Token (BYOK)</div>
									<input
										type="password"
										placeholder="Paste Google OAuth Access Token (ya29...)"
										value={manualToken}
										onChange={(e) => setManualToken(e.target.value)}
										className="w-full rounded-md border bg-background px-3 py-1.5 text-xs font-mono"
									/>
									<input
										type="text"
										placeholder="Channel Name (optional, e.g. My Channel)"
										value={manualChannelTitle}
										onChange={(e) => setManualChannelTitle(e.target.value)}
										className="w-full rounded-md border bg-background px-3 py-1.5 text-xs"
									/>
									<Button size="sm" onClick={handleSaveManualToken} className="text-xs">
										Save & Sync Token
									</Button>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Automation Preferences */}
			<Card>
				<CardHeader>
					<CardTitle>Automations</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium">Auto-generate daily growth report</div>
							<p className="text-muted-foreground text-xs">
								Generates a new strategic report the first time you open the reports page on a new day.
							</p>
						</div>
						<Switch checked={autoReport} onCheckedChange={(v) => void setAutoReport(v)} />
					</div>
				</CardContent>
			</Card>

			{/* Data Storage & Cleanup */}
			<Card>
				<CardHeader>
					<CardTitle>Storage & Local Data</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					<p className="text-muted-foreground">
						All analytics snapshots ({snapshots.length}) and AI reports ({reports.length}) are stored
						locally in your browser&apos;s IndexedDB. Zero data is sent to external database servers.
					</p>

					<div>
						<Button
							variant="outline"
							size="sm"
							onClick={async () => {
								if (confirm("Delete all locally stored YouTube analytics snapshots and reports?")) {
									await clearYouTubeData();
									await initialize();
									toast.success("YouTube local data cleared");
								}
							}}
						>
							Clear stored YouTube data
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default function YouTubeSettingsPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center py-24">
					<Spinner className="size-6" />
				</div>
			}
		>
			<YouTubeSettingsInner />
		</Suspense>
	);
}
