/**
 * Shared client-side YouTube connection model and storage helpers.
 *
 * This module is the single source of truth for the connected Google/YouTube
 * account in the browser. Both YouTube Analytics and YouTube Publishing
 * use this connection.
 */

import {
	loadUserApiKeys,
	saveUserApiKeys,
	type YouTubeConnectionData,
	subscribeToApiKeys,
} from "@/services/api-keys/storage";
import { shouldRefreshToken, isTokenExpired } from "@/analytics/token";

export type YouTubeConnection = YouTubeConnectionData;

export function getYouTubeConnection(): YouTubeConnection | null {
	const keys = loadUserApiKeys();
	if (keys.youtubeConnection?.accessToken) {
		return keys.youtubeConnection;
	}

	// Legacy single token fallback
	if (keys.youtubeAccessToken) {
		return {
			accessToken: keys.youtubeAccessToken,
			expiresAt: Date.now() + 3600 * 1000,
			channelId: "",
			channelTitle: "YouTube Account",
		};
	}

	return null;
}

export function saveYouTubeConnection(connection: YouTubeConnection): void {
	const current = loadUserApiKeys();
	saveUserApiKeys({
		...current,
		youtubeConnection: connection,
		youtubeAccessToken: connection.accessToken,
	});
}

export function clearYouTubeConnection(): void {
	const current = loadUserApiKeys();
	saveUserApiKeys({
		...current,
		youtubeConnection: undefined,
		youtubeAccessToken: undefined,
	});
}

export function isYouTubeConnected(): boolean {
	const conn = getYouTubeConnection();
	if (!conn || !conn.accessToken) return false;
	return !isTokenExpired(conn.expiresAt);
}

export function getYouTubeAccessToken(): string | null {
	const conn = getYouTubeConnection();
	if (!conn || isTokenExpired(conn.expiresAt)) return null;
	return conn.accessToken;
}

/** Reads the handoff from URL query or one-time httpOnly cookie left by Google OAuth callback. */
export async function pickupYouTubeOAuthHandoff(): Promise<YouTubeConnection | null> {
	// 1. First check URL query parameter (bypasses browser cookie blocking)
	if (typeof window !== "undefined") {
		try {
			const search = new URLSearchParams(window.location.search);
			const urlHandoff = search.get("_yt_handoff");
			if (urlHandoff) {
				const rawJson = atob(urlHandoff.replace(/-/g, "+").replace(/_/g, "/"));
				const payload = JSON.parse(rawJson);
				if (payload.accessToken) {
					const connection: YouTubeConnection = {
						accessToken: payload.accessToken,
						refreshToken: payload.refreshToken,
						expiresAt: payload.expiresAt || Date.now() + 3600 * 1000,
						channelId: payload.channelId || "default_channel",
						channelTitle: payload.channelTitle || "YouTube Account",
						channelCustomUrl: payload.channelCustomUrl,
						avatarUrl: payload.avatarUrl,
					};
					saveYouTubeConnection(connection);
					// Clean URL param without page reload
					search.delete("_yt_handoff");
					const cleanUrl = `${window.location.pathname}${search.toString() ? `?${search.toString()}` : ""}`;
					window.history.replaceState({}, "", cleanUrl);
					return connection;
				}
			}
		} catch (err) {
			console.warn("Failed to parse YouTube URL handoff:", err);
		}
	}

	// 2. Cookie fallback
	try {
		const res = await fetch("/api/youtube/oauth/session");
		if (!res.ok) return null;

		const payload = (await res.json()) as {
			connected?: boolean;
			accessToken?: string;
			refreshToken?: string;
			expiresAt?: number;
			channelId?: string;
			channelTitle?: string;
			channelCustomUrl?: string;
			avatarUrl?: string;
		};

		if (!payload.connected || !payload.accessToken) {
			return null;
		}

		const connection: YouTubeConnection = {
			accessToken: payload.accessToken,
			refreshToken: payload.refreshToken,
			expiresAt: payload.expiresAt || Date.now() + 3600 * 1000,
			channelId: payload.channelId || "default_channel",
			channelTitle: payload.channelTitle || "YouTube Account",
			channelCustomUrl: payload.channelCustomUrl,
			avatarUrl: payload.avatarUrl,
		};

		saveYouTubeConnection(connection);
		return connection;
	} catch (error) {
		console.warn("Failed to pick up YouTube OAuth handoff:", error);
		return null;
	}
}

/**
 * Checks if the stored access token is expiring and calls /api/youtube/oauth/refresh.
 */
export async function refreshYouTubeTokenIfNeeded(): Promise<YouTubeConnection | null> {
	const conn = getYouTubeConnection();
	if (!conn || !conn.refreshToken) return conn;

	// Only refresh when close to expiring (<5 mins)
	if (!shouldRefreshToken(conn.expiresAt)) {
		return conn;
	}

	try {
		const res = await fetch("/api/youtube/oauth/refresh", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refreshToken: conn.refreshToken }),
		});

		if (!res.ok) {
			console.warn("YouTube token refresh returned non-200:", res.status);
			return conn;
		}

		const payload = (await res.json()) as {
			accessToken?: string;
			expiresAt?: number;
		};

		if (!payload.accessToken || !payload.expiresAt) return conn;

		const refreshed: YouTubeConnection = {
			...conn,
			accessToken: payload.accessToken,
			expiresAt: payload.expiresAt,
		};

		saveYouTubeConnection(refreshed);
		return refreshed;
	} catch (error) {
		console.warn("Failed to refresh YouTube token:", error);
		return conn;
	}
}

export function subscribeToYouTubeConnection(
	callback: (conn: YouTubeConnection | null) => void,
): () => void {
	return subscribeToApiKeys((keys) => {
		callback(keys.youtubeConnection || null);
	});
}
