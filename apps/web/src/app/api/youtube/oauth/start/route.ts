import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildYouTubeAuthorizeUrl } from "@/analytics/youtube-oauth";
import {
	isYouTubeOAuthConfigured,
	youtubeDisabledResponse,
	youtubeRedirectUri,
	DEFAULT_YOUTUBE_CALLBACK_PATH,
} from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kicks off Google / YouTube OAuth consent flow by redirecting the browser.
 * Supports an optional ?returnTo=/path query param.
 */
export async function GET(request: NextRequest) {
	if (!isYouTubeOAuthConfigured()) {
		return youtubeDisabledResponse();
	}

	const rawReturnTo = request.nextUrl.searchParams.get("returnTo");
	const returnTo = rawReturnTo && rawReturnTo.startsWith("/") ? rawReturnTo : undefined;

	const authorizeUrl = buildYouTubeAuthorizeUrl({
		clientId: process.env.GOOGLE_CLIENT_ID as string,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		redirectUri: youtubeRedirectUri(DEFAULT_YOUTUBE_CALLBACK_PATH),
		returnTo,
	});

	return NextResponse.redirect(authorizeUrl, { status: 302 });
}
