/**
 * Browser-side persistence for the Instagram analytics feature: daily metric
 * snapshots, generated reports, and sync metadata live in IndexedDB so the
 * dashboard stays local-first (no server database — see docs/DECISIONS.md).
 * The Instagram access token is NOT stored here; it lives in localStorage
 * via services/api-keys.
 */
import type { DailySnapshot, StoredReport } from "@/analytics/types";
import type { YouTubeDailySnapshot } from "@/analytics/youtube-types";

const DB_NAME = "kneecap_analytics_v1";
const DB_VERSION = 2;
const SNAPSHOTS = "snapshots";
const REPORTS = "reports";
const META = "meta";

// YouTube object stores
const YOUTUBE_SNAPSHOTS = "youtube_snapshots";
const YOUTUBE_REPORTS = "youtube_reports";
const YOUTUBE_META = "youtube_meta";

export interface AnalyticsMeta {
	lastSyncAt?: string;
	/** Auto-generate a report when the Reports page opens on a new day. */
	autoReport?: boolean;
	/** Last report generation date (YYYY-MM-DD) for the auto-report check. */
	lastReportDate?: string;
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(SNAPSHOTS)) {
				db.createObjectStore(SNAPSHOTS, { keyPath: "date" });
			}
			if (!db.objectStoreNames.contains(REPORTS)) {
				const reports = db.createObjectStore(REPORTS, { keyPath: "id" });
				reports.createIndex("createdAt", "createdAt");
			}
			if (!db.objectStoreNames.contains(META)) {
				db.createObjectStore(META);
			}
			if (!db.objectStoreNames.contains(YOUTUBE_SNAPSHOTS)) {
				db.createObjectStore(YOUTUBE_SNAPSHOTS, { keyPath: "date" });
			}
			if (!db.objectStoreNames.contains(YOUTUBE_REPORTS)) {
				const ytReports = db.createObjectStore(YOUTUBE_REPORTS, { keyPath: "id" });
				ytReports.createIndex("createdAt", "createdAt");
			}
			if (!db.objectStoreNames.contains(YOUTUBE_META)) {
				db.createObjectStore(YOUTUBE_META);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
	});
}

function withStore<T>(
	storeName: string,
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
	return openDb().then(
		(db) =>
			new Promise<T | undefined>((resolve, reject) => {
				const tx = db.transaction(storeName, mode);
				const store = tx.objectStore(storeName);
				let result: T | undefined;
				const request = run(store);
				if (request) {
					request.onsuccess = () => {
						result = request.result;
					};
				}
				tx.oncomplete = () => {
					db.close();
					resolve(result);
				};
				tx.onerror = () => {
					db.close();
					reject(tx.error ?? new Error("IndexedDB transaction failed"));
				};
			}),
	);
}

// ---------------------------------------------------------------------------
// Instagram Snapshots
// ---------------------------------------------------------------------------

export function saveSnapshot(snapshot: DailySnapshot): Promise<void> {
	return withStore(SNAPSHOTS, "readwrite", (store) => store.put(snapshot)).then(
		() => undefined,
	);
}

export function listSnapshots(): Promise<DailySnapshot[]> {
	return withStore<DailySnapshot[]>(SNAPSHOTS, "readonly", (store) => store.getAll()).then(
		(rows) => (rows ?? []).sort((a, b) => a.date.localeCompare(b.date)),
	);
}

export function clearAllData(): Promise<void> {
	return openDb().then(
		(db) =>
			new Promise<void>((resolve, reject) => {
				const tx = db.transaction([SNAPSHOTS, REPORTS, META], "readwrite");
				tx.objectStore(SNAPSHOTS).clear();
				tx.objectStore(REPORTS).clear();
				tx.objectStore(META).clear();
				tx.oncomplete = () => {
					db.close();
					resolve();
				};
				tx.onerror = () => {
					db.close();
					reject(tx.error ?? new Error("IndexedDB clear failed"));
				};
			}),
	);
}

// ---------------------------------------------------------------------------
// YouTube Snapshots & Data
// ---------------------------------------------------------------------------

export function saveYouTubeSnapshot(snapshot: YouTubeDailySnapshot): Promise<void> {
	return withStore(YOUTUBE_SNAPSHOTS, "readwrite", (store) => store.put(snapshot)).then(
		() => undefined,
	);
}

export function listYouTubeSnapshots(): Promise<YouTubeDailySnapshot[]> {
	return withStore<YouTubeDailySnapshot[]>(
		YOUTUBE_SNAPSHOTS,
		"readonly",
		(store) => store.getAll(),
	).then((rows) => (rows ?? []).sort((a, b) => a.date.localeCompare(b.date)));
}

export function saveYouTubeReport(report: StoredReport): Promise<void> {
	return withStore(YOUTUBE_REPORTS, "readwrite", (store) => store.put(report)).then(
		() => undefined,
	);
}

export function listYouTubeReports(): Promise<StoredReport[]> {
	return withStore<StoredReport[]>(YOUTUBE_REPORTS, "readonly", (store) => store.getAll()).then(
		(rows) => (rows ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
	);
}

export function getYouTubeMeta(): Promise<AnalyticsMeta> {
	return withStore<AnalyticsMeta>(YOUTUBE_META, "readonly", (store) => store.get("meta")).then(
		(val) => val ?? { autoReport: true },
	);
}

export function setYouTubeMeta(patch: Partial<AnalyticsMeta>): Promise<void> {
	return getYouTubeMeta().then((current) => {
		const next = { ...current, ...patch };
		return withStore(YOUTUBE_META, "readwrite", (store) => store.put(next, "meta")).then(
			() => undefined,
		);
	});
}

export function clearYouTubeData(): Promise<void> {
	return openDb().then(
		(db) =>
			new Promise<void>((resolve, reject) => {
				const tx = db.transaction([YOUTUBE_SNAPSHOTS, YOUTUBE_REPORTS, YOUTUBE_META], "readwrite");
				tx.objectStore(YOUTUBE_SNAPSHOTS).clear();
				tx.objectStore(YOUTUBE_REPORTS).clear();
				tx.objectStore(YOUTUBE_META).clear();
				tx.oncomplete = () => {
					db.close();
					resolve();
				};
				tx.onerror = () => {
					db.close();
					reject(tx.error ?? new Error("IndexedDB YouTube clear failed"));
				};
			}),
	);
}

// ---------------------------------------------------------------------------
// Reports (Instagram)
// ---------------------------------------------------------------------------

export function saveReport(report: StoredReport): Promise<void> {
	return withStore(REPORTS, "readwrite", (store) => store.put(report)).then(
		() => undefined,
	);
}

export function listReports(): Promise<StoredReport[]> {
	return withStore<StoredReport[]>(REPORTS, "readonly", (store) => store.getAll()).then(
		(rows) => (rows ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
	);
}

export function deleteReport(id: string): Promise<void> {
	return withStore(REPORTS, "readwrite", (store) => store.delete(id)).then(
		() => undefined,
	);
}

// ---------------------------------------------------------------------------
// Metadata (Instagram)
// ---------------------------------------------------------------------------

export function getMeta(): Promise<AnalyticsMeta> {
	return withStore<AnalyticsMeta>(META, "readonly", (store) => store.get("meta")).then(
		(val) => val ?? { autoReport: true },
	);
}

export function setMeta(patch: Partial<AnalyticsMeta>): Promise<void> {
	return getMeta().then((current) => {
		const next = { ...current, ...patch };
		return withStore(META, "readwrite", (store) => store.put(next, "meta")).then(
			() => undefined,
		);
	});
}
