/**
 * Pure helpers for the client-side long-lived-token lifecycle. The token
 * itself lives in localStorage (see services/api-keys); these helpers decide
 * when it must be renewed so a connected account never expires while in use.
 */

/** Refresh the token when less than this much life is left. */
export const TOKEN_REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function shouldRefreshToken(
	expiresAtMs: number | null | undefined,
	nowMs: number = Date.now(),
): boolean {
	if (expiresAtMs === null || expiresAtMs === undefined) return false;
	return expiresAtMs - nowMs < TOKEN_REFRESH_WINDOW_MS;
}

export function isTokenExpired(
	expiresAtMs: number | null | undefined,
	nowMs: number = Date.now(),
): boolean {
	if (expiresAtMs === null || expiresAtMs === undefined) return false;
	return nowMs >= expiresAtMs;
}

/** Local calendar date key (`YYYY-MM-DD`) for snapshot/report keys. */
export function toDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}
