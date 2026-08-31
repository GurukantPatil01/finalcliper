"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAnalyticsStore } from "@/services/analytics/store";
import { clearAllData } from "@/services/analytics/db";
import { saveInstagramConnection } from "@/services/instagram/connection";

const CONNECT_URL = "/api/instagram/oauth/start?returnTo=/analytics/settings";
// Client component — direct static access so the bundler inlines the value.
const AI_ENABLED = process.env.NEXT_PUBLIC_AI_ENABLED === "true";

function SettingsInner() {
	const searchParams = useSearchParams();
	const {
		hydrated,
		connection,
		username,
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
	} = useAnalyticsStore();
	const [initializing, setInitializing] = useState(true);
	const [manualToken, setManualToken] = useState("");
	const [manualUserId, setManualUserId] = useState("");
	const [manualUsername, setManualUsername] = useState("");
	const [showManual, setShowManual] = useState(false);

	const connectResult = searchParams.get("connect");
	const connectMessage = searchParams.get("message");

	useEffect(() => {
		void initialize().then(async () => {
			if (connectResult === "success") {
				await pickupOAuthHandoff();
				toast.success("Instagram connected successfully!");
				void syncNow();
			}
			setInitializing(false);
		});
	}, [initialize, pickupOAuthHandoff, connectResult, syncNow]);

	useEffect(() => {
		if (connectResult === "error" && connectMessage) {
			toast.error(`Connection error: ${connectMessage}`);
		}
	}, [connectResult, connectMessage]);

	if (!hydrated || initializing) {
		return (
			<div className="flex items-center justify-center py-24">
				<Spinner className="size-6" />
			</div>
		);
	}

	const handleSaveManual = () => {
		if (!manualToken.trim()) {
			toast.error("Please enter a valid Instagram Graph Access Token.");
			return;
		}
		saveInstagramConnection({
			accessToken: manualToken.trim(),
			expiresAt: Date.now() + 60 * 86400 * 1000,
			userId: manualUserId.trim() || "instagram_user",
			username: manualUsername.trim() || undefined,
		});
		toast.success("Instagram access token saved!");
		setManualToken("");
		void syncNow();
	};

	const daysLeft =
		tokenExpiresAt !== undefined
			? Math.max(0, Math.ceil((tokenExpiresAt - Date.now()) / 86_400_000))
			: null;

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Instagram connection</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					{connection === "connected" ? (
						<>
							<p>
								Connected{username ? ` as @${username}` : ""}. Token expires in{" "}
								{daysLeft ?? "?"} day{daysLeft === 1 ? "" : "s"} — it refreshes
								automatically during syncs once less than 7 days remain.
							</p>
							<div className="flex flex-wrap gap-2">
								<Button size="sm" disabled={syncing} onClick={() => void syncNow()}>
									{syncing ? <Spinner className="size-4" /> : null}
									{syncing ? "Syncing..." : "Sync now"}
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={generating || snapshots.length === 0}
									onClick={() => void generateReportNow()}
								>
									{generating ? <Spinner className="size-4" /> : null}
									Generate report now
								</Button>
								<Button
									size="sm"
									variant="destructive"
									onClick={() => {
										disconnect();
										toast.success("Instagram disconnected");
									}}
								>
									Disconnect
								</Button>
							</div>
						</>
					) : connection === "expired" ? (
						<>
							<p className="text-destructive">
								The access token expired or was revoked. Reconnect to continue
								syncing — your stored history is kept.
							</p>
							<Button asChild size="sm">
								<a href={CONNECT_URL}>Reconnect Instagram</a>
							</Button>
						</>
					) : (
						<>
							<p className="text-muted-foreground">
								Connect your Creator/Business Instagram account via the official OAuth
								flow. The long-lived token is stored only in this browser and sent
								per-request to the local sync route.
							</p>
							<div className="flex flex-wrap items-center gap-3">
								<Button asChild size="sm">
									<a href={CONNECT_URL}>Connect Instagram</a>
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
									<div className="font-medium text-xs">Direct Graph Access Token (BYOK)</div>
									<input
										type="password"
										placeholder="Paste Instagram / Meta Access Token (EAAB...)"
										value={manualToken}
										onChange={(e) => setManualToken(e.target.value)}
										className="w-full rounded-md border bg-background px-3 py-1.5 text-xs font-mono"
									/>
									<div className="grid grid-cols-2 gap-2">
										<input
											type="text"
											placeholder="Instagram User ID (optional)"
											value={manualUserId}
											onChange={(e) => setManualUserId(e.target.value)}
											className="w-full rounded-md border bg-background px-3 py-1.5 text-xs font-mono"
										/>
										<input
											type="text"
											placeholder="Username (optional, e.g. myaccount)"
											value={manualUsername}
											onChange={(e) => setManualUsername(e.target.value)}
											className="w-full rounded-md border bg-background px-3 py-1.5 text-xs"
										/>
									</div>
									<Button size="sm" onClick={handleSaveManual} className="text-xs">
										Save & Sync Token
									</Button>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Reports</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					<label className="flex items-center justify-between gap-4">
						<span>
							Auto-generate on open
							<span className="text-muted-foreground block text-xs">
								When you open the Reports page on a new day, data syncs and the
								morning report generates itself.
							</span>
						</span>
						<Switch
							checked={autoReport}
							onCheckedChange={(value) => void setAutoReport(value)}
						/>
					</label>
					<p className="text-muted-foreground">
						{reports.length} report{reports.length === 1 ? "" : "s"} stored.{" "}
						<Link href="/analytics/reports" className="text-primary hover:underline">
							View reports
						</Link>
					</p>
					<p className="text-muted-foreground text-xs">
						Report writer: {AI_ENABLED ? "AI/LLM" : "rule-based"} — configured
						server-side via LLM_* or GEMINI_API_KEY env vars; falls back to
						rule-based when unavailable.
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Data</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<p className="text-muted-foreground">
						{snapshots.length} daily snapshot{snapshots.length === 1 ? "" : "s"} stored in
						this browser (IndexedDB). Last sync:{" "}
						{lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "never"}.
					</p>
					<Button
						size="sm"
						variant="destructive"
						disabled={snapshots.length === 0 && reports.length === 0}
						onClick={() => {
							void clearAllData().then(() => {
								toast.success("Analytics data cleared");
								return initialize();
							});
						}}
					>
						Delete all analytics data
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

export default function AnalyticsSettingsPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center py-24">
					<Spinner className="size-6" />
				</div>
			}
		>
			<SettingsInner />
		</Suspense>
	);
}
