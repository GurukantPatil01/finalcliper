/**
 * Server-only Instagram API client ("Instagram API with Instagram Login").
 *
 * Every function here runs inside a Node route handler; the access token is
 * supplied per-request by the client (stored in the user's localStorage, same
 * trust model as the existing publish keys) — see docs/DECISIONS.md.
 *
 * Insight metric availability varies by account and API version, so every
 * per-metric read is best-effort: failures become `null`, never thrown.
 */
import type { AccountMetrics, ReelMetrics } from "./types";

const GRAPH_VERSION = "v23.0";
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;
/** Host is referenced here (server-only source) — tracked by offline-audit. */
const TOKEN_BASE = "https://api.instagram.com/oauth/access_token";

/** A long-lived token from the exchange/refresh endpoints. */
export interface LongLivedToken {
	accessToken: string;
	/** Seconds until expiry (long-lived tokens are ~60 days). */
	expiresIn: number;
}

export class InstagramTokenError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InstagramTokenError";
	}
}

export class InstagramPermissionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InstagramPermissionError";
	}
}

export class InstagramPublishError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InstagramPublishError";
	}
}

async function graphFetch<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, init);
	const body: unknown = await res.json().catch(() => null);
	if (!res.ok) {
		const err = body as { error?: { message?: string; code?: number; type?: string } } | null;
		const message = err?.error?.message ?? `HTTP ${res.status}`;
		const code = err?.error?.code;
		if (res.status === 401 || code === 190) {
			throw new InstagramTokenError(`Instagram rejected the token: ${message}`);
		}
		if (
			code === 200 ||
			code === 10 ||
			message.toLowerCase().includes("permission") ||
			message.toLowerCase().includes("scope") ||
			message.toLowerCase().includes("instagram_business_content_publish")
		) {
			throw new InstagramPermissionError(
				`Missing Instagram publishing permissions: ${message}`,
			);
		}
		throw new Error(`Instagram API error: ${message}`);
	}
	return body as T;
}

function formPost<T>(url: string, params: URLSearchParams): Promise<T> {
	return fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: params.toString(),
	}).then(async (res) => {
		const body: unknown = await res.json().catch(() => null);
		if (!res.ok) {
			const err = body as { error_message?: string; error?: { message?: string } } | null;
			throw new InstagramTokenError(
				err?.error_message ?? err?.error?.message ?? `HTTP ${res.status}`,
			);
		}
		return body as T;
	});
}

// ---------------------------------------------------------------------------
// Token lifecycle
// ---------------------------------------------------------------------------

/** Short-lived code → short-lived token. */
export function exchangeCodeForToken(params: {
	appId: string;
	appSecret: string;
	redirectUri: string;
	code: string;
}): Promise<{ accessToken: string; userId: string }> {
	const form = new URLSearchParams({
		client_id: params.appId,
		client_secret: params.appSecret,
		grant_type: "authorization_code",
		redirect_uri: params.redirectUri,
		code: params.code,
	});
	return formPost<{ access_token: string; user_id: string }>(TOKEN_BASE, form).then(
		(data) => ({ accessToken: data.access_token, userId: String(data.user_id) }),
	);
}

/** Short-lived → ~60-day long-lived token. */
export function exchangeForLongLivedToken(params: {
	shortLivedToken: string;
	appSecret: string;
}): Promise<LongLivedToken> {
	const url = new URL(`${GRAPH_BASE}/access_token`);
	url.searchParams.set("grant_type", "ig_exchange_token");
	url.searchParams.set("client_secret", params.appSecret);
	url.searchParams.set("access_token", params.shortLivedToken);
	return graphFetch<{ access_token: string; expires_in: number }>(
		url.toString(),
	).then((data) => ({ accessToken: data.access_token, expiresIn: data.expires_in }));
}

/** Renew an unexpired long-lived token (returns a fresh ~60-day one). */
export function refreshLongLivedToken(accessToken: string): Promise<LongLivedToken> {
	const url = new URL(`${GRAPH_BASE}/refresh_access_token`);
	url.searchParams.set("grant_type", "ig_refresh_token");
	url.searchParams.set("access_token", accessToken);
	return graphFetch<{ access_token: string; expires_in: number }>(
		url.toString(),
	).then((data) => ({ accessToken: data.access_token, expiresIn: data.expires_in }));
}

// ---------------------------------------------------------------------------
// Account + media
// ---------------------------------------------------------------------------

interface GraphMedia {
	id: string;
	caption?: string;
	media_type?: string;
	media_product_type?: string;
	permalink?: string;
	thumbnail_url?: string;
	timestamp?: string;
	like_count?: number;
	comments_count?: number;
}

interface GraphMediaPage {
	data: GraphMedia[];
	paging?: { next?: string };
}

interface GraphInsightValue {
	name: string;
	total_value?: { value: number };
	values?: { value: number }[];
}

function insightNumber(metrics: GraphInsightValue[], ...names: string[]): number | null {
	for (const name of names) {
		const metric = metrics.find((m) => m.name === name);
		if (metric) {
			const value = metric.total_value?.value ?? metric.values?.[0]?.value;
			if (typeof value === "number") return value;
		}
	}
	return null;
}

/** Account profile numbers. Each insight metric is best-effort. */
export async function fetchAccountMetrics(
	accessToken: string,
): Promise<AccountMetrics> {
	const profileUrl = new URL(`${GRAPH_BASE}/me`);
	profileUrl.searchParams.set(
		"fields",
		"user_id,username,account_type,followers_count,follows_count,media_count",
	);
	profileUrl.searchParams.set("access_token", accessToken);
	const profile = await graphFetch<{
		user_id: string;
		username: string;
		followers_count?: number;
	}>(profileUrl.toString());

	const account: AccountMetrics = {
		username: profile.username,
		followersCount: profile.followers_count ?? null,
		views: null,
		reach: null,
		profileViews: null,
	};

	// User-level insights (views / reach / profile_views) — metric support
	// varies, so each is fetched independently and tolerated to fail.
	const metricMap: [keyof AccountMetrics, string][] = [
		["views", "views"],
		["reach", "reach"],
		["profileViews", "profile_views"],
	];
	await Promise.all(
		metricMap.map(async ([key, metric]) => {
			try {
				const url = new URL(`${GRAPH_BASE}/me/insights`);
				url.searchParams.set("metric", metric);
				url.searchParams.set("period", "day");
				url.searchParams.set("metric_type", "total_value");
				url.searchParams.set("access_token", accessToken);
				const data = await graphFetch<{ data?: GraphInsightValue[] }>(
					url.toString(),
				);
				const value = data.data?.[0]?.total_value?.value;
				if (typeof value === "number") {
					// `views`/`reach` are the only keys typed number|null here.
					(account[key] as number | null) = value;
				}
			} catch {
				// Metric not available for this account — leave null.
			}
		}),
	);

	return account;
}

/**
 * All reels (media_product_type === "REELS") with per-reel insights.
 * Returns at most `limit` most recent reels; insight failures degrade to null.
 */
export async function fetchReelsWithInsights(
	accessToken: string,
	limit = 50,
): Promise<ReelMetrics[]> {
	const mediaUrl = new URL(`${GRAPH_BASE}/me/media`);
	mediaUrl.searchParams.set(
		"fields",
		"id,caption,media_type,media_product_type,permalink,thumbnail_url,timestamp,like_count,comments_count",
	);
	mediaUrl.searchParams.set("limit", "100");
	mediaUrl.searchParams.set("access_token", accessToken);

	const reels: ReelMetrics[] = [];
	let next: string | null = mediaUrl.toString();
	while (next && reels.length < limit) {
		const page: GraphMediaPage = await graphFetch<GraphMediaPage>(next);
		for (const media of page.data ?? []) {
			if (media.media_product_type !== "REELS" && media.media_type !== "VIDEO") continue;
			if (reels.length >= limit) break;
			const insights = await fetchReelInsights(accessToken, media.id);
			const likes = typeof media.like_count === "number" ? media.like_count : insights.likes;
			const comments = typeof media.comments_count === "number" ? media.comments_count : insights.comments;
			reels.push({
				id: media.id,
				caption: media.caption ?? "",
				permalink: media.permalink,
				thumbnailUrl: media.thumbnail_url,
				timestamp: media.timestamp ?? new Date().toISOString(),
				views: insights.views ?? insights.reach ?? null,
				reach: insights.reach ?? null,
				likes: likes ?? null,
				comments: comments ?? null,
				saves: insights.saves ?? null,
				shares: insights.shares ?? null,
				follows: insights.follows ?? null,
				totalInteractions:
					insights.totalInteractions ??
					(likes !== null || comments !== null ? (likes ?? 0) + (comments ?? 0) : null),
			});
		}
		next = page.paging?.next ?? null;
	}
	return reels;
}

const REEL_INSIGHT_METRICS = [
	"views",
	"plays",
	"reach",
	"likes",
	"comments",
	"saved",
	"shares",
	"follows",
	"total_interactions",
];

/** Per-reel insights; a failing/unavailable metric set yields nulls. */
export async function fetchReelInsights(
	accessToken: string,
	mediaId: string,
): Promise<
	Pick<
		ReelMetrics,
		| "views"
		| "reach"
		| "likes"
		| "comments"
		| "saves"
		| "shares"
		| "follows"
		| "totalInteractions"
	>
> {
	const empty = {
		views: null,
		reach: null,
		likes: null,
		comments: null,
		saves: null,
		shares: null,
		follows: null,
		totalInteractions: null,
	} as const;
	try {
		const url = new URL(`${GRAPH_BASE}/${mediaId}/insights`);
		url.searchParams.set("metric", REEL_INSIGHT_METRICS.join(","));
		url.searchParams.set("access_token", accessToken);
		const data = await graphFetch<{ data?: GraphInsightValue[] }>(url.toString());
		const metrics = data.data ?? [];
		return {
			views: insightNumber(metrics, "views", "plays"),
			reach: insightNumber(metrics, "reach"),
			likes: insightNumber(metrics, "likes"),
			comments: insightNumber(metrics, "comments"),
			saves: insightNumber(metrics, "saves", "saved"),
			shares: insightNumber(metrics, "shares"),
			follows: insightNumber(metrics, "follows"),
			totalInteractions: insightNumber(metrics, "total_interactions", "interactions"),
		};
	} catch {
		return { ...empty };
	}
}

// ---------------------------------------------------------------------------
// Reels Publishing (Instagram API with Instagram Login)
// ---------------------------------------------------------------------------

export interface CreateReelContainerParams {
	accessToken: string;
	userId: string;
	caption?: string;
	shareToFeed?: boolean;
}

export interface ContainerCreationResult {
	containerId: string;
	uploadUri: string;
}

/**
 * Step A: Initialize resumable upload container on graph.instagram.com
 */
export async function createReelContainer(
	params: CreateReelContainerParams,
): Promise<ContainerCreationResult> {
	const url = new URL(`${GRAPH_BASE}/${params.userId}/media`);
	url.searchParams.set("media_type", "REELS");
	url.searchParams.set("upload_type", "resumable");
	if (params.caption) url.searchParams.set("caption", params.caption);
	if (params.shareToFeed !== undefined) {
		url.searchParams.set("share_to_feed", params.shareToFeed ? "true" : "false");
	}
	url.searchParams.set("access_token", params.accessToken);

	const res = await graphFetch<{ id?: string; uri?: string }>(url.toString(), {
		method: "POST",
	});

	if (!res.id || !res.uri) {
		throw new InstagramPublishError("Failed to create Instagram upload container.");
	}

	return {
		containerId: res.id,
		uploadUri: res.uri,
	};
}

/**
 * Step B: Transfer binary video bytes to the upload URI
 */
export async function uploadVideoBytesToUri(params: {
	uploadUri: string;
	accessToken: string;
	videoBuffer: ArrayBuffer;
}): Promise<void> {
	const res = await fetch(params.uploadUri, {
		method: "POST",
		headers: {
			Authorization: `OAuth ${params.accessToken}`,
			offset: "0",
			file_size: params.videoBuffer.byteLength.toString(),
			"Content-Type": "application/octet-stream",
		},
		body: params.videoBuffer,
	});

	if (!res.ok) {
		const errText = await res.text().catch(() => `HTTP ${res.status}`);
		throw new InstagramPublishError(`Video binary transfer to Instagram failed: ${errText}`);
	}
}

/**
 * Step C: Poll status of the upload container until FINISHED (or ERROR / timeout)
 */
export async function waitForContainerProcessing(params: {
	containerId: string;
	accessToken: string;
	maxAttempts?: number;
	delayMs?: number;
}): Promise<void> {
	const maxAttempts = params.maxAttempts ?? 30; // 30 * 2s = 60s
	const delayMs = params.delayMs ?? 2000;

	for (let i = 0; i < maxAttempts; i++) {
		await new Promise((resolve) => setTimeout(resolve, delayMs));

		const statusUrl = new URL(`${GRAPH_BASE}/${params.containerId}`);
		statusUrl.searchParams.set("fields", "status_code,status");
		statusUrl.searchParams.set("access_token", params.accessToken);

		const data = await graphFetch<{ status_code?: string; status?: string }>(
			statusUrl.toString(),
		);

		if (data.status_code === "FINISHED") {
			return;
		}

		if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
			throw new InstagramPublishError(
				data.status || "Instagram reported a processing error for the uploaded video.",
			);
		}
	}

	throw new InstagramPublishError("Video processing timed out on Instagram servers.");
}

/**
 * Step D: Publish the processed media container
 */
export async function publishReelContainer(params: {
	accessToken: string;
	userId: string;
	containerId: string;
}): Promise<{ postId: string }> {
	const url = new URL(`${GRAPH_BASE}/${params.userId}/media_publish`);
	url.searchParams.set("creation_id", params.containerId);
	url.searchParams.set("access_token", params.accessToken);

	const data = await graphFetch<{ id?: string }>(url.toString(), {
		method: "POST",
	});

	if (!data.id) {
		throw new InstagramPublishError("Failed to publish media container to Instagram.");
	}

	return { postId: data.id };
}

/**
 * Step E (Optional): Retrieve permalink for published reel
 */
export async function fetchMediaPermalink(
	accessToken: string,
	mediaId: string,
): Promise<string | null> {
	try {
		const url = new URL(`${GRAPH_BASE}/${mediaId}`);
		url.searchParams.set("fields", "permalink");
		url.searchParams.set("access_token", accessToken);

		const data = await graphFetch<{ permalink?: string }>(url.toString());
		return data.permalink || null;
	} catch {
		return null;
	}
}

