"use client";

/**
 * Client-side orchestration for the Instagram analytics dashboard: OAuth
 * handoff pickup, token auto-refresh, sync ("Sync now" + on-open), and report
 * generation ("Generate now" + auto-generate when the Reports page opens on a
 * new day). All network calls go through the server-only /api/instagram/
 * analytics/* routes; snapshots and reports persist in IndexedDB.
 */
import { create } from "zustand";
import { buildDataPack } from "@/analytics/data-pack";
import { buildRuleBasedReport } from "@/analytics/rule-based-report";
import { shouldRefreshToken, toDateKey } from "@/analytics/token";
import type { DataPack, DailySnapshot, StoredReport } from "@/analytics/types";
import {
	getInstagramConnection,
	saveInstagramConnection,
	clearInstagramConnection,
	pickupInstagramOAuthHandoff,
	refreshInstagramTokenIfNeeded,
	isInstagramConnected,
	subscribeToInstagramConnection,
} from "@/services/instagram/connection";
import {
	getMeta,
	listReports,
	listSnapshots,
	saveReport,
	saveSnapshot,
	setMeta,
} from "./db";

type ConnectionStatus = "disconnected" | "connected" | "expired";

interface AnalyticsState {
	hydrated: boolean;
	syncing: boolean;
	generating: boolean;
	error?: string;
	connection: ConnectionStatus;
	username?: string;
	tokenExpiresAt?: number;
	lastSyncAt?: string;
	lastReportDate?: string;
	autoReport: boolean;
	snapshots: DailySnapshot[];
	reports: StoredReport[];

	initialize(): Promise<void>;
	pickupOAuthHandoff(): Promise<void>;
	syncNow(): Promise<void>;
	generateReportNow(): Promise<StoredReport | null>;
	ensureTodayReport(): Promise<void>;
	setAutoReport(value: boolean): Promise<void>;
	disconnect(): Promise<void>;
}

function apiHeaders(token: string): HeadersInit {
	return { "Content-Type": "application/json", "x-ig-token": token };
}

export const useAnalyticsStore = create<AnalyticsState>()((set, get) => ({
	hydrated: false,
	syncing: false,
	generating: false,
	connection: "disconnected",
	autoReport: true,
	snapshots: [],
	reports: [],

	async initialize() {
		const conn = getInstagramConnection();
		const [snapshots, reports, meta] = await Promise.all([
			listSnapshots(),
			listReports(),
			getMeta(),
		]);
		set({
			hydrated: true,
			snapshots,
			reports,
			lastSyncAt: meta.lastSyncAt,
			lastReportDate: meta.lastReportDate,
			autoReport: meta.autoReport ?? true,
			connection: conn?.accessToken ? (isInstagramConnected() ? "connected" : "expired") : "disconnected",
			username: conn?.username || snapshots[snapshots.length - 1]?.account.username,
			tokenExpiresAt: conn?.expiresAt,
		});
	},

	async pickupOAuthHandoff() {
		const conn = (await pickupInstagramOAuthHandoff()) || getInstagramConnection();
		if (conn?.accessToken) {
			set({
				connection: isInstagramConnected() ? "connected" : "expired",
				tokenExpiresAt: conn.expiresAt,
				username: conn.username || get().username,
				error: undefined,
			});
		}
	},

	/** Renews the long-lived token when <7 days of validity remain. */
	async syncNow() {
		const refreshedConn = await refreshInstagramTokenIfNeeded();
		const conn = refreshedConn || getInstagramConnection();
		let token = conn?.accessToken;

		if (!token) {
			set({ error: "Instagram is not connected yet." });
			return;
		}
		set({ syncing: true, error: undefined });
		try {
			if (conn?.expiresAt) {
				set({ tokenExpiresAt: conn.expiresAt });
			}

			const res = await fetch("/api/instagram/analytics/sync", {
				method: "POST",
				headers: apiHeaders(token),
			});
			if (res.status === 401) {
				set({ connection: "expired", syncing: false, error: "Instagram rejected the token — reconnect the account." });
				return;
			}
			if (!res.ok) {
				const body = (await res.json().catch(() => null)) as { message?: string } | null;
				throw new Error(body?.message ?? `Sync failed (HTTP ${res.status})`);
			}
			const data = (await res.json()) as {
				syncedAt: string;
				account: DailySnapshot["account"];
				reels: DailySnapshot["reels"];
			};
			const snapshot: DailySnapshot = {
				date: toDateKey(new Date()),
				syncedAt: data.syncedAt,
				account: data.account,
				reels: data.reels,
			};
			await saveSnapshot(snapshot);
			await setMeta({ lastSyncAt: data.syncedAt });

			// Save username to connection if available
			if (data.account.username && conn && !conn.username) {
				saveInstagramConnection({ ...conn, username: data.account.username });
			}

			set({
				snapshots: [
					...get().snapshots.filter((s) => s.date !== snapshot.date),
					snapshot,
				].sort((a, b) => a.date.localeCompare(b.date)),
				lastSyncAt: data.syncedAt,
				username: data.account.username,
				connection: "connected",
				syncing: false,
			});
		} catch (error) {
			set({
				syncing: false,
				error: error instanceof Error ? error.message : "Sync failed.",
			});
		}
	},

	async generateReportNow() {
		const snapshots = get().snapshots;
		if (snapshots.length === 0) {
			set({ error: "Sync your account first — reports need at least one snapshot." });
			return null;
		}
		set({ generating: true, error: undefined });
		try {
			const pack: DataPack = buildDataPack(snapshots);
			let report: StoredReport;
			try {
				const res = await fetch("/api/instagram/analytics/report", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ dataPack: pack }),
				});
				if (res.ok) {
					const body = (await res.json()) as { markdown: string; source: string };
					report = {
						id: crypto.randomUUID(),
						createdAt: new Date().toISOString(),
						forDate: pack.latestDay.date,
						source: body.source,
						markdown: body.markdown,
						dataPack: pack,
					};
				} else {
					// LLM unconfigured/failed — fall back to the rule-based report.
					report = {
						id: crypto.randomUUID(),
						createdAt: new Date().toISOString(),
						forDate: pack.latestDay.date,
						source: "rule-based",
						markdown: buildRuleBasedReport(pack),
						dataPack: pack,
					};
				}
			} catch {
				report = {
					id: crypto.randomUUID(),
					createdAt: new Date().toISOString(),
					forDate: pack.latestDay.date,
					source: "rule-based",
					markdown: buildRuleBasedReport(pack),
					dataPack: pack,
				};
			}
			await saveReport(report);
			const today = toDateKey(new Date());
			await setMeta({ lastReportDate: today });
			set({ reports: [report, ...get().reports], generating: false });
			return report;
		} catch (error) {
			set({
				generating: false,
				error: error instanceof Error ? error.message : "Report generation failed.",
			});
			return null;
		}
	},

	/** Called when the Reports page opens — generates today's report once. */
	async ensureTodayReport() {
		const { autoReport, lastReportDate, generating } = get();
		if (!autoReport || generating) return;
		if (lastReportDate === toDateKey(new Date())) return;
		if (get().snapshots.length === 0) return;
		await get().generateReportNow();
	},

	async setAutoReport(value) {
		await setMeta({ autoReport: value });
		set({ autoReport: value });
	},

	async disconnect() {
		clearInstagramConnection();
		set({ connection: "disconnected", tokenExpiresAt: undefined, username: undefined });
	},
}));

if (typeof window !== "undefined") {
	subscribeToInstagramConnection((conn) => {
		useAnalyticsStore.setState((state) => ({
			connection: conn?.accessToken
				? isInstagramConnected()
					? "connected"
					: "expired"
				: "disconnected",
			username: conn?.username || state.username,
			tokenExpiresAt: conn?.expiresAt,
		}));
	});
}
