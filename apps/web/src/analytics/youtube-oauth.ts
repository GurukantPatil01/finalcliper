/**
 * Pure helpers for Google / YouTube OAuth authorize step and token exchanges.
 * Server-only in practice: keeps Google secrets away from the client bundle.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export const YOUTUBE_SCOPES = [
	"https://www.googleapis.com/auth/youtube.readonly",
	"https://www.googleapis.com/auth/yt-analytics.readonly",
	"https://www.googleapis.com/auth/youtube.upload",
] as const;

/** OAuth state validity window (10 minutes). */
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

export interface YouTubeAuthorizeParams {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	returnTo?: string;
	now?: number;
}

export function buildYouTubeAuthorizeUrl(params: YouTubeAuthorizeParams): string {
	const url = new URL(GOOGLE_AUTHORIZE_URL);
	url.searchParams.set("client_id", params.clientId);
	url.searchParams.set("redirect_uri", params.redirectUri);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", YOUTUBE_SCOPES.join(" "));
	url.searchParams.set("access_type", "offline");
	url.searchParams.set("prompt", "consent");
	url.searchParams.set(
		"state",
		createYouTubeState(params.clientSecret, params.returnTo, params.now),
	);
	return url.toString();
}

function createYouTubeState(clientSecret: string, returnTo?: string, now?: number): string {
	const ts = String(now ?? Date.now());
	if (returnTo && returnTo.startsWith("/")) {
		const encodedReturn = Buffer.from(returnTo, "utf8").toString("base64url");
		const payload = `${ts}.${encodedReturn}`;
		return `${payload}.${hmac(clientSecret, payload)}`;
	}
	return `${ts}.${hmac(clientSecret, ts)}`;
}

export interface StateVerificationResult {
	valid: boolean;
	returnTo?: string;
}

export function verifyYouTubeState(
	state: string,
	clientSecret: string,
	now = Date.now(),
): StateVerificationResult {
	const parts = state.split(".");
	if (parts.length === 2) {
		const [tsStr, signature] = parts;
		const ts = Number(tsStr);
		if (!Number.isFinite(ts) || now - ts > STATE_MAX_AGE_MS || now < ts) {
			return { valid: false };
		}
		const expected = hmac(clientSecret, tsStr);
		if (!constantTimeEqual(signature, expected)) {
			return { valid: false };
		}
		return { valid: true };
	}

	if (parts.length === 3) {
		const [tsStr, encodedReturn, signature] = parts;
		const ts = Number(tsStr);
		if (!Number.isFinite(ts) || now - ts > STATE_MAX_AGE_MS || now < ts) {
			return { valid: false };
		}
		const payload = `${tsStr}.${encodedReturn}`;
		const expected = hmac(clientSecret, payload);
		if (!constantTimeEqual(signature, expected)) {
			return { valid: false };
		}
		try {
			const returnTo = Buffer.from(encodedReturn, "base64url").toString("utf8");
			if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
				return { valid: true, returnTo };
			}
		} catch {
			/* fall through */
		}
		return { valid: true };
	}

	return { valid: false };
}

function hmac(secret: string, payload: string): string {
	return createHmac("sha256", secret).update(payload).digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) return false;
	return timingSafeEqual(bufA, bufB);
}

export interface GoogleTokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
	scope: string;
}

export async function exchangeCodeForGoogleTokens({
	code,
	clientId,
	clientSecret,
	redirectUri,
}: {
	code: string;
	clientId: string;
	clientSecret: string;
	redirectUri: string;
}): Promise<GoogleTokenResponse> {
	const params = new URLSearchParams({
		code,
		client_id: clientId,
		client_secret: clientSecret,
		redirect_uri: redirectUri,
		grant_type: "authorization_code",
	});

	const res = await fetch(GOOGLE_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: params.toString(),
	});

	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(`Google token exchange failed (${res.status}): ${errorText}`);
	}

	return (await res.json()) as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken({
	refreshToken,
	clientId,
	clientSecret,
}: {
	refreshToken: string;
	clientId: string;
	clientSecret: string;
}): Promise<{ access_token: string; expires_in: number }> {
	const params = new URLSearchParams({
		refresh_token: refreshToken,
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: "refresh_token",
	});

	const res = await fetch(GOOGLE_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: params.toString(),
	});

	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(`Google token refresh failed (${res.status}): ${errorText}`);
	}

	return (await res.json()) as { access_token: string; expires_in: number };
}
