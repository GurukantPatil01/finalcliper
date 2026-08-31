export interface PlatformCredentials {
	youtube?: {
		accessToken?: string;
	};
	tiktok?: {
		accessToken?: string;
	};
}

const STORAGE_KEY = "kneecap_publisher_credentials_v1";

export function loadSavedCredentials(): PlatformCredentials {
	if (typeof window === "undefined") return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as PlatformCredentials & { instagram?: unknown };
		// Clean up any legacy manual instagram keys
		if (parsed.instagram) {
			delete parsed.instagram;
			saveCredentials(parsed);
		}
		return parsed;
	} catch {
		return {};
	}
}

export function saveCredentials(credentials: PlatformCredentials): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
	} catch (error) {
		console.warn("Failed to persist publisher credentials:", error);
	}
}
