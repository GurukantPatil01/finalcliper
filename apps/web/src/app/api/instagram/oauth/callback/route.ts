import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
	exchangeCodeForToken,
	exchangeForLongLivedToken,
	fetchAccountMetrics,
} from "@/analytics/graph-client";
import { verifyAndExtractState } from "@/analytics/oauth";
import { webEnv } from "@/env/web";
import {
	IG_HANDOFF_COOKIE,
	IG_LEGACY_HANDOFF_COOKIE,
	instagramRedirectUri,
	isInstagramOAuthConfigured,
	DEFAULT_OAUTH_CALLBACK_PATH,
} from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HandoffPayload {
	accessToken: string;
	expiresAt: number;
	userId: string;
	username?: string;
}

function authRedirect(targetPath: string, params: Record<string, string>): NextResponse {
	const url = new URL(targetPath.startsWith("/") ? targetPath : "/analytics/settings", webEnv.NEXT_PUBLIC_SITE_URL);
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return NextResponse.redirect(url.toString(), { status: 302 });
}

export async function handleInstagramOAuthCallback(request: NextRequest, defaultCallbackPath = DEFAULT_OAUTH_CALLBACK_PATH) {
	const defaultLanding = "/analytics/settings";

	if (!isInstagramOAuthConfigured()) {
		return authRedirect(defaultLanding, { connect: "error", message: "Instagram is not configured on this server." });
	}
	const appSecret = process.env.IG_APP_SECRET as string;

	const code = request.nextUrl.searchParams.get("code");
	const state = request.nextUrl.searchParams.get("state");
	const oauthError = request.nextUrl.searchParams.get("error_description");

	const stateResult = verifyAndExtractState(state, appSecret);
	const targetPath = stateResult.returnTo || defaultLanding;

	if (oauthError) {
		return authRedirect(targetPath, { connect: "error", message: oauthError });
	}
	if (!code || !stateResult.valid) {
		return authRedirect(targetPath, {
			connect: "error",
			message: "Invalid or expired OAuth state — start the connection again.",
		});
	}

	try {
		const shortLived = await exchangeCodeForToken({
			appId: process.env.IG_APP_ID as string,
			appSecret,
			redirectUri: instagramRedirectUri(defaultCallbackPath),
			code,
		});
		const longLived = await exchangeForLongLivedToken({
			shortLivedToken: shortLived.accessToken,
			appSecret,
		});

		let username: string | undefined;
		try {
			username = (await fetchAccountMetrics(longLived.accessToken)).username;
		} catch {
			// Username lookup is cosmetic — don't fail the connection over it.
		}

		const payload: HandoffPayload = {
			accessToken: longLived.accessToken,
			expiresAt: Date.now() + longLived.expiresIn * 1000,
			userId: shortLived.userId,
			username,
		};
		const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

		const response = authRedirect(targetPath, {
			connect: "success",
			_ig_handoff: encodedPayload,
			...(username ? { username } : {}),
		});

		const isHttps =
			request.nextUrl.protocol === "https:" &&
			!request.nextUrl.hostname.includes("localhost") &&
			!request.nextUrl.hostname.includes("127.0.0.1");

		const cookieOpts = {
			httpOnly: true,
			sameSite: "lax" as const,
			secure: isHttps,
			path: "/",
			maxAge: 300,
		};

		response.cookies.set(IG_HANDOFF_COOKIE, encodedPayload, cookieOpts);
		response.cookies.set(IG_LEGACY_HANDOFF_COOKIE, encodedPayload, cookieOpts);

		return response;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Token exchange failed.";
		return authRedirect(targetPath, { connect: "error", message });
	}
}

export async function GET(request: NextRequest) {
	return handleInstagramOAuthCallback(request, DEFAULT_OAUTH_CALLBACK_PATH);
}
