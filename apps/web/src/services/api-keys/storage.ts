export interface InstagramConnectionData {
	accessToken: string;
	expiresAt: number;
	userId: string;
	username?: string;
}

export interface YouTubeConnectionData {
	accessToken: string;
	refreshToken?: string;
	expiresAt: number;
	channelId: string;
	channelTitle: string;
	channelCustomUrl?: string;
	avatarUrl?: string;
}

export interface UserApiKeys {
	geminiApiKey?: string;
	instagramAccessToken?: string;
	instagramAccountId?: string;
	youtubeAccessToken?: string;
	tiktokAccessToken?: string;
	openaiApiKey?: string;
	elevenLabsApiKey?: string;
	// Instagram connection (shared for analytics + publishing)
	instagramConnection?: InstagramConnectionData;
	// YouTube connection (shared for analytics + publishing)
	youtubeConnection?: YouTubeConnectionData;
	// Legacy fields for backward compatibility
	instagramAnalyticsToken?: string;
	/** Milliseconds since epoch when the long-lived token expires. */
	instagramAnalyticsTokenExpiresAt?: number;
	instagramAnalyticsUserId?: string;
}

const STORAGE_KEY = "kneecap_user_api_keys_v1";
const API_KEYS_CHANGED_EVENT = "kneecap:api_keys_changed";

function getStorage(): Storage | null {
	if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
	if (typeof globalThis !== "undefined" && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
		return (globalThis as unknown as { localStorage: Storage }).localStorage;
	}
	return null;
}

export function loadUserApiKeys(): UserApiKeys {
	const storage = getStorage();
	if (!storage) return {};
	try {
		const raw = storage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as UserApiKeys;
		// Auto-migrate legacy analytics keys if instagramConnection is not present
		if (!parsed.instagramConnection && parsed.instagramAnalyticsToken) {
			parsed.instagramConnection = {
				accessToken: parsed.instagramAnalyticsToken,
				expiresAt: parsed.instagramAnalyticsTokenExpiresAt ?? 0,
				userId: parsed.instagramAnalyticsUserId ?? "",
			};
		}
		return parsed;
	} catch {
		return {};
	}
}

export function saveUserApiKeys(keys: UserApiKeys): void {
	const storage = getStorage();
	if (!storage) return;
	try {
		storage.setItem(STORAGE_KEY, JSON.stringify(keys));
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent(API_KEYS_CHANGED_EVENT, { detail: keys }));
		}
	} catch (error) {
		console.warn("Failed to persist user API keys:", error);
	}
}

export function getUserApiKey(name: keyof UserApiKeys): string | undefined {
	const keys = loadUserApiKeys();
	const val = keys[name];
	if (typeof val === "string") return val.trim() || undefined;
	return undefined;
}

export function clearUserApiKeys(): void {
	const storage = getStorage();
	if (!storage) return;
	storage.removeItem(STORAGE_KEY);
	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent(API_KEYS_CHANGED_EVENT, { detail: {} }));
	}
}

/** Removes Instagram connection and legacy token fields, keeping other keys. */
export function clearAnalyticsKeys(): void {
	if (typeof window === "undefined") return;
	const keys = loadUserApiKeys();
	saveUserApiKeys({
		...keys,
		instagramConnection: undefined,
		instagramAnalyticsToken: undefined,
		instagramAnalyticsTokenExpiresAt: undefined,
		instagramAnalyticsUserId: undefined,
		instagramAccessToken: undefined,
		instagramAccountId: undefined,
	});
}

/** Removes YouTube connection and tokens, keeping other keys. */
export function clearYouTubeAnalyticsKeys(): void {
	if (typeof window === "undefined") return;
	const keys = loadUserApiKeys();
	saveUserApiKeys({
		...keys,
		youtubeConnection: undefined,
		youtubeAccessToken: undefined,
	});
}

export function subscribeToApiKeys(callback: (keys: UserApiKeys) => void): () => void {
	if (typeof window === "undefined") return () => {};
	const handler = (e: Event) => {
		const custom = e as CustomEvent<UserApiKeys>;
		callback(custom.detail || loadUserApiKeys());
	};
	window.addEventListener(API_KEYS_CHANGED_EVENT, handler);
	return () => window.removeEventListener(API_KEYS_CHANGED_EVENT, handler);
}
