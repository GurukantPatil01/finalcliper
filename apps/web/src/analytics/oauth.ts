/**
 * Pure helpers for the Instagram OAuth ("Instagram API with Instagram Login")
 * authorize step. Server-only in practice: the authorize URL is built inside
 * `GET /api/instagram/analytics/start` and delivered via a 302 redirect so no
 * Instagram host string ever reaches the client bundle (offline-audit gate —
 * see docs/DECISIONS.md).
 *
 * There is no server-side session storage in this app, so the CSRF `state`
 * is stateless: `<timestamp>.<hmac(timestamp)>` keyed with IG_APP_SECRET and
 * verified for signature + freshness in the callback.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Host is referenced here (server-only source) — tracked by offline-audit. */
export const IG_AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";

export const IG_SCOPES = [
	"instagram_business_basic",
	"instagram_business_manage_insights",
	"instagram_business_content_publish",
] as const;

/** OAuth state validity window (10 minutes). */
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

export interface AuthorizeParams {
	appId: string;
	appSecret: string;
	redirectUri: string;
	/** Optional safe relative path to return to after OAuth (e.g. "/" or "/analytics/settings"). */
	returnTo?: string;
	/** Milliseconds since epoch; defaults to Date.now() (injectable in tests). */
	now?: number;
}

export function buildAuthorizeUrl(params: AuthorizeParams): string {
	const url = new URL(IG_AUTHORIZE_URL);
	url.searchParams.set("client_id", params.appId);
	url.searchParams.set("redirect_uri", params.redirectUri);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", IG_SCOPES.join(","));
	url.searchParams.set("state", createState(params.appSecret, params.returnTo, params.now));
	return url.toString();
}

function createState(appSecret: string, returnTo?: string, now?: number): string {
	const ts = String(now ?? Date.now());
	if (returnTo && returnTo.startsWith("/")) {
		const encodedReturn = Buffer.from(returnTo, "utf8").toString("base64url");
		const payload = `${ts}.${encodedReturn}`;
		return `${payload}.${hmac(appSecret, payload)}`;
	}
	return `${ts}.${hmac(appSecret, ts)}`;
}

export interface StateVerificationResult {
	valid: boolean;
	returnTo?: string;
}

export function verifyAndExtractState(
	state: string | null,
	appSecret: string,
	now: number = Date.now(),
): StateVerificationResult {
	if (!state) return { valid: false };
	const parts = state.split(".");
	if (parts.length === 2) {
		const [ts, sig] = parts;
		if (!/^\d+$/.test(ts)) return { valid: false };
		if (now - Number(ts) > STATE_MAX_AGE_MS) return { valid: false };
		const valid = safeEqual(hmac(appSecret, ts), sig);
		return { valid };
	}
	if (parts.length === 3) {
		const [ts, encodedReturn, sig] = parts;
		if (!/^\d+$/.test(ts)) return { valid: false };
		if (now - Number(ts) > STATE_MAX_AGE_MS) return { valid: false };
		const payload = `${ts}.${encodedReturn}`;
		const valid = safeEqual(hmac(appSecret, payload), sig);
		if (!valid) return { valid: false };
		try {
			const returnTo = Buffer.from(encodedReturn, "base64url").toString("utf8");
			if (returnTo.startsWith("/")) {
				return { valid: true, returnTo };
			}
		} catch {
			// Ignore decoding error
		}
		return { valid: true };
	}
	return { valid: false };
}

export function verifyState(
	state: string | null,
	appSecret: string,
	now: number = Date.now(),
): boolean {
	return verifyAndExtractState(state, appSecret, now).valid;
}

function hmac(secret: string, value: string): string {
	return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
	const bufA = Buffer.from(a, "utf8");
	const bufB = Buffer.from(b, "utf8");
	if (bufA.length !== bufB.length) return false;
	return timingSafeEqual(bufA, bufB);
}
