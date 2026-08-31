/**
 * Shared helpers for the `/api/instagram/*` route handlers (OAuth, Analytics, Publishing).
 *
 * All Instagram routes are:
 *   - runtime = "nodejs" (node:crypto for OAuth state, server-only secrets)
 *   - gated: they 503 when the feature flag or required config is missing.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { webEnv } from "@/env/web";

export const DEFAULT_OAUTH_CALLBACK_PATH = "/api/instagram/oauth/callback";
export const LEGACY_ANALYTICS_CALLBACK_PATH = "/api/instagram/analytics/callback";

export const IG_HANDOFF_COOKIE = "ig_oauth_handoff";
export const IG_LEGACY_HANDOFF_COOKIE = "ig_analytics_handoff";

/** True when the OAuth app credentials are present in the server env. */
export function isInstagramOAuthConfigured(): boolean {
	return Boolean(process.env.IG_APP_ID && process.env.IG_APP_SECRET);
}

/** Effective OAuth redirect URI (override-able for tunnels/proxies). */
export function instagramRedirectUri(callbackPath = DEFAULT_OAUTH_CALLBACK_PATH): string {
	if (process.env.IG_REDIRECT_URI) {
		return process.env.IG_REDIRECT_URI;
	}
	return `${webEnv.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")}${callbackPath}`;
}

/**
 * The user's Instagram access token, supplied per-request from the browser
 * (stored in their localStorage).
 */
export function extractIgToken(request: NextRequest): string | undefined {
	const header = request.headers.get("x-ig-token");
	return header?.trim() || undefined;
}

/** JSON 503 when the Instagram feature is unconfigured. */
export function instagramDisabledResponse(): NextResponse {
	return NextResponse.json(
		{
			error: "ig_disabled",
			message:
				"Instagram integration is not enabled or configured. Set IG_APP_ID and IG_APP_SECRET on the server to enable it.",
		},
		{ status: 503 },
	);
}

export function analyticsDisabledResponse(): NextResponse {
	return NextResponse.json(
		{
			error: "ig_analytics_disabled",
			message:
				"Instagram analytics is not enabled. Set NEXT_PUBLIC_IG_ANALYTICS_ENABLED=true " +
				"plus IG_APP_ID/IG_APP_SECRET on the server to enable it.",
		},
		{ status: 503 },
	);
}

/** JSON 400 when the request carries no user token. */
export function tokenRequiredResponse(): NextResponse {
	return NextResponse.json(
		{
			error: "ig_token_required",
			message: "Connect Instagram first to perform this action.",
		},
		{ status: 400 },
	);
}
