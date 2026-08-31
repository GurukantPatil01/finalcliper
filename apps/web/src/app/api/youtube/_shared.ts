/**
 * Shared helpers for the `/api/youtube/*` route handlers (OAuth, Analytics, Publishing).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { webEnv } from "@/env/web";

export const DEFAULT_YOUTUBE_CALLBACK_PATH = "/api/youtube/oauth/callback";
export const YOUTUBE_HANDOFF_COOKIE = "yt_oauth_handoff";

/** True when Google OAuth client credentials are configured. */
export function isYouTubeOAuthConfigured(): boolean {
	return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Effective Google OAuth redirect URI. */
export function youtubeRedirectUri(callbackPath = DEFAULT_YOUTUBE_CALLBACK_PATH): string {
	if (process.env.YOUTUBE_REDIRECT_URI) {
		return process.env.YOUTUBE_REDIRECT_URI;
	}
	return `${webEnv.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")}${callbackPath}`;
}

/**
 * The user's YouTube access token, supplied per-request from the browser.
 */
export function extractYouTubeToken(request: NextRequest): string | undefined {
	const header = request.headers.get("x-youtube-token") || request.headers.get("authorization");
	if (header?.startsWith("Bearer ")) {
		return header.replace("Bearer ", "").trim();
	}
	return header?.trim() || undefined;
}

/** JSON 503 when YouTube OAuth is not configured on the server. */
export function youtubeDisabledResponse(): NextResponse {
	return NextResponse.json(
		{
			error: "youtube_disabled",
			message:
				"YouTube OAuth is not configured on the server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local to enable it.",
		},
		{ status: 503 },
	);
}

export function youtubeAnalyticsDisabledResponse(): NextResponse {
	return NextResponse.json(
		{
			error: "youtube_analytics_disabled",
			message:
				"YouTube analytics is not enabled. Set NEXT_PUBLIC_YOUTUBE_ANALYTICS_ENABLED=true " +
				"plus GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in .env.local to enable it.",
		},
		{ status: 503 },
	);
}

/** JSON 400 when request carries no user token. */
export function youtubeTokenRequiredResponse(): NextResponse {
	return NextResponse.json(
		{
			error: "youtube_token_required",
			message: "Connect your YouTube channel first to perform this action.",
		},
		{ status: 400 },
	);
}
