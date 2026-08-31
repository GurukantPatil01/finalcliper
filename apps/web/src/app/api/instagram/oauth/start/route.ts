import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildAuthorizeUrl } from "@/analytics/oauth";
import {
	instagramDisabledResponse,
	instagramRedirectUri,
	isInstagramOAuthConfigured,
	DEFAULT_OAUTH_CALLBACK_PATH,
} from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kicks off the Instagram OAuth consent flow by redirecting the browser to
 * Instagram's authorize screen. Supports an optional ?returnTo=/path query param.
 */
export async function GET(request: NextRequest) {
	if (!isInstagramOAuthConfigured()) {
		return instagramDisabledResponse();
	}

	const rawReturnTo = request.nextUrl.searchParams.get("returnTo");
	const returnTo = rawReturnTo && rawReturnTo.startsWith("/") ? rawReturnTo : undefined;

	const authorizeUrl = buildAuthorizeUrl({
		appId: process.env.IG_APP_ID as string,
		appSecret: process.env.IG_APP_SECRET as string,
		redirectUri: instagramRedirectUri(DEFAULT_OAUTH_CALLBACK_PATH),
		returnTo,
	});

	return NextResponse.redirect(authorizeUrl, { status: 302 });
}
