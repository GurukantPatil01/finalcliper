/**
 * Shared client-side Instagram connection model and storage helpers.
 *
 * This module is the single source of truth for the connected Instagram
 * account in the browser. Both Instagram Analytics and Instagram Publishing
 * use this connection.
 */

import {
	getUserApiKey,
	loadUserApiKeys,
	saveUserApiKeys,
	type UserApiKeys,
	subscribeToApiKeys,
} from "@/services/api-keys/storage";
import { shouldRefreshToken, isTokenExpired } from "@/analytics/token";

export interface InstagramConnection {
	accessToken: string;
	/** Milliseconds since epoch when the long-lived token expires. */
	expiresAt: number;
	userId: string;
	username?: string;
}

export function getInstagramConnection(): InstagramConnection | null {
	const keys = loadUserApiKeys();
	if (keys.instagramConnection?.accessToken) {
		return keys.instagramConnection;
	}

	// Legacy analytics key fallback / migration
	if (keys.instagramAnalyticsToken) {
		return {
			accessToken: keys.instagramAnalyticsToken,
			expiresAt: keys.instagramAnalyticsTokenExpiresAt ?? 0,
			userId: keys.instagramAnalyticsUserId ?? "",
		};
	}

	return null;
}

export function saveInstagramConnection(connection: InstagramConnection): void {
	const current = loadUserApiKeys();
	saveUserApiKeys({
		...current,
		instagramConnection: connection,
		// Keep legacy fields synchronized during transition
		instagramAnalyticsToken: connection.accessToken,
		instagramAnalyticsTokenExpiresAt: connection.expiresAt,
		instagramAnalyticsUserId: connection.userId,
		// Clean up old manual publisher fields
		instagramAccessToken: undefined,
		instagramAccountId: undefined,
	});
}

export function clearInstagramConnection(): void {
	const current = loadUserApiKeys();
	saveUserApiKeys({
		...current,
		instagramConnection: undefined,
		instagramAnalyticsToken: undefined,
		instagramAnalyticsTokenExpiresAt: undefined,
		instagramAnalyticsUserId: undefined,
		instagramAccessToken: undefined,
		instagramAccountId: undefined,
	});
}

export function isInstagramConnected(): boolean {
	const conn = getInstagramConnection();
	if (!conn || !conn.accessToken) return false;
	return !isTokenExpired(conn.expiresAt);
}

export function getInstagramAccessToken(): string | null {
	const conn = getInstagramConnection();
	if (!conn || isTokenExpired(conn.expiresAt)) return null;
	return conn.accessToken;
}

/** Reads the handoff from URL query or one-time httpOnly cookie left by OAuth callback. */
export async function pickupInstagramOAuthHandoff(): Promise<InstagramConnection | null> {
	// 1. First check URL query parameter (bypasses browser cookie blocking)
	if (typeof window !== "undefined") {
		try {
			const search = new URLSearchParams(window.location.search);
			const urlHandoff = search.get("_ig_handoff");
			if (urlHandoff) {
				const rawJson = atob(urlHandoff.replace(/-/g, "+").replace(/_/g, "/"));
				const payload = JSON.parse(rawJson);
				if (payload.accessToken) {
					const connection: InstagramConnection = {
						accessToken: payload.accessToken,
						expiresAt: payload.expiresAt || Date.now() + 60 * 86400 * 1000,
						userId: payload.userId || "instagram_user",
						username: payload.username,
					};
					saveInstagramConnection(connection);
					// Clean URL param without page reload
					search.delete("_ig_handoff");
					const cleanUrl = `${window.location.pathname}${search.toString() ? `?${search.toString()}` : ""}`;
					window.history.replaceState({}, "", cleanUrl);
					return connection;
				}
			}
		} catch (err) {
			console.warn("Failed to parse Instagram URL handoff:", err);
		}
	}

	// 2. Cookie fallback
	try {
		const res = await fetch("/api/instagram/oauth/session");
		if (!res.ok) return null;

		const payload = (await res.json()) as {
			connected?: boolean;
			accessToken?: string;
			expiresAt?: number;
			userId?: string;
			username?: string;
		};

		if (!payload.connected || !payload.accessToken) {
			return null;
		}

		const connection: InstagramConnection = {
			accessToken: payload.accessToken,
			expiresAt: payload.expiresAt || Date.now() + 60 * 86400 * 1000,
			userId: payload.userId || "instagram_user",
			username: payload.username,
		};

		saveInstagramConnection(connection);
		return connection;
	} catch {
		return null;
	}
}

/** Renews the long-lived token when <7 days of validity remain. */
export async function refreshInstagramTokenIfNeeded(): Promise<InstagramConnection | null> {
	const conn = getInstagramConnection();
	if (!conn || !conn.accessToken) return null;

	if (!shouldRefreshToken(conn.expiresAt)) {
		return conn;
	}

	try {
		let res = await fetch("/api/instagram/oauth/refresh", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-ig-token": conn.accessToken,
			},
		});

		if (!res.ok) {
			res = await fetch("/api/instagram/analytics/refresh", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-ig-token": conn.accessToken,
				},
			});
		}

		if (res.ok) {
			const refreshed = (await res.json()) as {
				accessToken: string;
				expiresAt: number;
			};
			const updated: InstagramConnection = {
				...conn,
				accessToken: refreshed.accessToken,
				expiresAt: refreshed.expiresAt,
			};
			saveInstagramConnection(updated);
			return updated;
		}

		if (res.status === 401) {
			// Token invalid/revoked
			clearInstagramConnection();
			return null;
		}

		return conn;
	} catch {
		return conn;
	}
}

export function subscribeToInstagramConnection(
	callback: (conn: InstagramConnection | null) => void,
): () => void {
	return subscribeToApiKeys(() => {
		callback(getInstagramConnection());
	});
}
