import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildAuthorizeUrl } from "@/analytics/oauth";
import {
	analyticsDisabledResponse,
	instagramRedirectUri,
	isInstagramOAuthConfigured,
	LEGACY_ANALYTICS_CALLBACK_PATH,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Legacy start route for backwards compatibility.
 */
export async function GET(request: NextRequest) {
	if (!isInstagramOAuthConfigured()) {
		return analyticsDisabledResponse();
	}
	const rawReturnTo = request.nextUrl.searchParams.get("returnTo");
	const returnTo = rawReturnTo && rawReturnTo.startsWith("/") ? rawReturnTo : undefined;

	const authorizeUrl = buildAuthorizeUrl({
		appId: process.env.IG_APP_ID as string,
		appSecret: process.env.IG_APP_SECRET as string,
		redirectUri: instagramRedirectUri(LEGACY_ANALYTICS_CALLBACK_PATH),
		returnTo,
	});
	return NextResponse.redirect(authorizeUrl, { status: 302 });
}
