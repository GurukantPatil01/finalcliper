"use client";

import { create } from "zustand";
import { buildYouTubeDataPack } from "@/analytics/youtube-data-pack";
import { toDateKey } from "@/analytics/token";
import type { YouTubeDailySnapshot, YouTubeDataPack } from "@/analytics/youtube-types";
import type { StoredReport } from "@/analytics/types";
import {
	getYouTubeConnection,
	saveYouTubeConnection,
	clearYouTubeConnection,
	pickupYouTubeOAuthHandoff,
	refreshYouTubeTokenIfNeeded,
	isYouTubeConnected,
	subscribeToYouTubeConnection,
} from "@/services/youtube/connection";
import {
	getYouTubeMeta,
	listYouTubeReports,
	listYouTubeSnapshots,
	saveYouTubeReport,
	saveYouTubeSnapshot,
	setYouTubeMeta,
	clearYouTubeData,
} from "./db";

type ConnectionStatus = "disconnected" | "connected" | "expired";

interface YouTubeAnalyticsState {
	hydrated: boolean;
	syncing: boolean;
	generating: boolean;
	error?: string;
	connection: ConnectionStatus;
	channelTitle?: string;
	channelId?: string;
	avatarUrl?: string;
	tokenExpiresAt?: number;
	lastSyncAt?: string;
	lastReportDate?: string;
	autoReport: boolean;
	snapshots: YouTubeDailySnapshot[];
	reports: StoredReport[];

	initialize(): Promise<void>;
	pickupOAuthHandoff(): Promise<void>;
	syncNow(): Promise<void>;
	generateReportNow(): Promise<StoredReport | null>;
	ensureTodayReport(): Promise<void>;
	setAutoReport(value: boolean): Promise<void>;
	disconnect(): Promise<void>;
}

export const useYouTubeAnalyticsStore = create<YouTubeAnalyticsState>()((set, get) => ({
	hydrated: false,
	syncing: false,
	generating: false,
	connection: "disconnected",
	autoReport: true,
	snapshots: [],
	reports: [],

	async initialize() {
		const conn = getYouTubeConnection();
		const [snapshots, reports, meta] = await Promise.all([
			listYouTubeSnapshots(),
			listYouTubeReports(),
			getYouTubeMeta(),
		]);

		set({
			hydrated: true,
			snapshots,
			reports,
			lastSyncAt: meta.lastSyncAt,
			lastReportDate: meta.lastReportDate,
			autoReport: meta.autoReport ?? true,
			connection: conn?.accessToken
				? isYouTubeConnected()
					? "connected"
					: "expired"
				: "disconnected",
			channelTitle: conn?.channelTitle || snapshots[snapshots.length - 1]?.channel.title,
			channelId: conn?.channelId,
			avatarUrl: conn?.avatarUrl,
			tokenExpiresAt: conn?.expiresAt,
		});
	},

	async pickupOAuthHandoff() {
		const conn = (await pickupYouTubeOAuthHandoff()) || getYouTubeConnection();
		if (conn?.accessToken) {
			set({
				connection: isYouTubeConnected() ? "connected" : "expired",
				tokenExpiresAt: conn.expiresAt,
				channelTitle: conn.channelTitle,
				channelId: conn.channelId,
				avatarUrl: conn.avatarUrl,
				error: undefined,
			});
		}
	},

	async syncNow() {
		const conn = await refreshYouTubeTokenIfNeeded();
		if (!conn?.accessToken) {
			set({ connection: "disconnected", error: "YouTube channel is not connected." });
			return;
		}

		set({ syncing: true, error: undefined });

		try {
			const res = await fetch("/api/youtube/analytics/sync", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-youtube-token": conn.accessToken,
				},
			});

			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { message?: string };
				throw new Error(body.message || `Sync returned HTTP ${res.status}`);
			}

			const data = (await res.json()) as { snapshot: YouTubeDailySnapshot };
			await saveYouTubeSnapshot(data.snapshot);

			const nowIso = new Date().toISOString();
			await setYouTubeMeta({ lastSyncAt: nowIso });

			const snapshots = await listYouTubeSnapshots();
			set({
				snapshots,
				lastSyncAt: nowIso,
				syncing: false,
				connection: "connected",
				channelTitle: data.snapshot.channel.title,
			});
		} catch (error) {
			console.error("YouTube syncNow failed:", error);
			set({
				syncing: false,
				error: error instanceof Error ? error.message : "Sync failed",
			});
		}
	},

	async generateReportNow(): Promise<StoredReport | null> {
		const { snapshots } = get();
		if (snapshots.length === 0) return null;

		set({ generating: true, error: undefined });

		try {
			const pack = buildYouTubeDataPack(snapshots);
			const res = await fetch("/api/youtube/analytics/report", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ dataPack: pack }),
			});

			let markdown = "";
			let source: "gemini" | "openai-compatible" | "rule-based" = "rule-based";

			if (res.ok) {
				const body = (await res.json()) as {
					markdown: string;
					source: "gemini" | "openai-compatible" | "rule-based";
				};
				markdown = body.markdown;
				source = body.source;
			} else {
				// Fallback
				const { generateYouTubeRuleBasedReport } = await import(
					"@/analytics/youtube-rule-based-report"
				);
				markdown = generateYouTubeRuleBasedReport(pack);
				source = "rule-based";
			}

			const today = toDateKey(new Date());
			const stored: StoredReport = {
				id: `yt-report-${today}-${Date.now()}`,
				createdAt: new Date().toISOString(),
				forDate: today,
				source,
				markdown,
				dataPack: pack as any,
			};

			await saveYouTubeReport(stored);
			await setYouTubeMeta({ lastReportDate: today });

			const reports = await listYouTubeReports();
			set({ reports, lastReportDate: today, generating: false });
			return stored;
		} catch (error) {
			console.error("YouTube report generation failed:", error);
			set({
				generating: false,
				error: error instanceof Error ? error.message : "Report generation failed",
			});
			return null;
		}
	},

	async ensureTodayReport() {
		const { autoReport, lastReportDate, snapshots } = get();
		if (!autoReport || snapshots.length === 0) return;
		const today = toDateKey(new Date());
		if (lastReportDate !== today) {
			await get().generateReportNow();
		}
	},

	async setAutoReport(value: boolean) {
		await setYouTubeMeta({ autoReport: value });
		set({ autoReport: value });
	},

	async disconnect() {
		clearYouTubeConnection();
		await clearYouTubeData();
		set({
			connection: "disconnected",
			channelTitle: undefined,
			channelId: undefined,
			avatarUrl: undefined,
			tokenExpiresAt: undefined,
			lastSyncAt: undefined,
			lastReportDate: undefined,
			snapshots: [],
			reports: [],
			error: undefined,
		});
	},
}));

if (typeof window !== "undefined") {
	subscribeToYouTubeConnection((conn) => {
		useYouTubeAnalyticsStore.setState({
			connection: conn?.accessToken
				? isYouTubeConnected()
					? "connected"
					: "expired"
				: "disconnected",
			channelTitle: conn?.channelTitle,
			channelId: conn?.channelId,
			avatarUrl: conn?.avatarUrl,
			tokenExpiresAt: conn?.expiresAt,
		});
	});
}
