import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
	exchangeCodeForGoogleTokens,
	verifyYouTubeState,
} from "@/analytics/youtube-oauth";
import {
	isYouTubeOAuthConfigured,
	youtubeDisabledResponse,
	youtubeRedirectUri,
	DEFAULT_YOUTUBE_CALLBACK_PATH,
	YOUTUBE_HANDOFF_COOKIE,
} from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	if (!isYouTubeOAuthConfigured()) {
		return youtubeDisabledResponse();
	}

	const code = request.nextUrl.searchParams.get("code");
	const state = request.nextUrl.searchParams.get("state");
	const oauthError = request.nextUrl.searchParams.get("error");

	if (oauthError) {
		return NextResponse.redirect(
			new URL(`/analytics/youtube/settings?error=${encodeURIComponent(oauthError)}`, request.url),
		);
	}

	if (!code || !state) {
		return NextResponse.json(
			{ error: "bad_request", message: "Missing code or state parameter." },
			{ status: 400 },
		);
	}

	const verification = verifyYouTubeState(
		state,
		process.env.GOOGLE_CLIENT_SECRET as string,
	);
	if (!verification.valid) {
		return NextResponse.json(
			{ error: "invalid_state", message: "OAuth state parameter signature failed or expired." },
			{ status: 400 },
		);
	}

	try {
		const tokenRes = await exchangeCodeForGoogleTokens({
			code,
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
			redirectUri: youtubeRedirectUri(DEFAULT_YOUTUBE_CALLBACK_PATH),
		});

		// Fetch channel profile info
		let channelId = "";
		let channelTitle = "YouTube Account";
		let channelCustomUrl = "";
		let avatarUrl = "";

		try {
			const channelRes = await fetch(
				"https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
				{
					headers: { Authorization: `Bearer ${tokenRes.access_token}` },
				},
			);

			if (channelRes.ok) {
				const channelData = await channelRes.json();
				const item = channelData.items?.[0];
				if (item) {
					channelId = item.id;
					channelTitle = item.snippet?.title || channelTitle;
					channelCustomUrl = item.snippet?.customUrl || "";
					avatarUrl =
						item.snippet?.thumbnails?.default?.url ||
						item.snippet?.thumbnails?.medium?.url ||
						"";
				}
			}
		} catch (err) {
			console.warn("YouTube channel fetch warning:", err);
		}

		// Fallback to Google UserInfo if channel was not found or has no public channel yet
		if (!channelId) {
			try {
				const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
					headers: { Authorization: `Bearer ${tokenRes.access_token}` },
				});
				if (userRes.ok) {
					const userData = await userRes.json();
					channelId = userData.id ? `user_${userData.id}` : "";
					channelTitle = userData.name || userData.email || channelTitle;
					avatarUrl = userData.picture || avatarUrl;
				}
			} catch {
				/* fall through */
			}
		}

		// Ensure channelId is never empty
		if (!channelId) {
			channelId = `yt_account_${Math.random().toString(36).slice(2, 10)}`;
		}

		const expiresAt = Date.now() + tokenRes.expires_in * 1000;

		const payload = {
			accessToken: tokenRes.access_token,
			refreshToken: tokenRes.refresh_token,
			expiresAt,
			channelId,
			channelTitle,
			channelCustomUrl,
			avatarUrl,
		};

		const serialized = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

		const target = verification.returnTo || "/analytics/youtube/settings";
		const redirectUrl = new URL(target, request.url);
		redirectUrl.searchParams.set("connected", "1");
		redirectUrl.searchParams.set("_yt_handoff", serialized);

		const response = NextResponse.redirect(redirectUrl, { status: 302 });

		const isHttps =
			request.nextUrl.protocol === "https:" &&
			!request.nextUrl.hostname.includes("localhost") &&
			!request.nextUrl.hostname.includes("127.0.0.1");

		response.cookies.set(YOUTUBE_HANDOFF_COOKIE, serialized, {
			httpOnly: true,
			secure: isHttps,
			sameSite: "lax",
			path: "/",
			maxAge: 300,
		});

		return response;
	} catch (error) {
		console.error("YouTube OAuth callback error:", error);
		const errTarget = new URL("/analytics/youtube/settings", request.url);
		errTarget.searchParams.set(
			"error",
			error instanceof Error ? error.message : "oauth_failed",
		);
		return NextResponse.redirect(errTarget, { status: 302 });
	}
}
