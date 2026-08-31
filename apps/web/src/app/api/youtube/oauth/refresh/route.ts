import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { refreshGoogleAccessToken } from "@/analytics/youtube-oauth";
import { isYouTubeOAuthConfigured, youtubeDisabledResponse } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
	if (!isYouTubeOAuthConfigured()) {
		return youtubeDisabledResponse();
	}

	let refreshToken: string | undefined;
	try {
		const body = await request.json();
		refreshToken = body?.refreshToken;
	} catch {
		return NextResponse.json(
			{ error: "bad_request", message: "Body must be JSON with a refreshToken string." },
			{ status: 400 },
		);
	}

	if (!refreshToken || typeof refreshToken !== "string") {
		return NextResponse.json(
			{ error: "bad_request", message: "A valid refreshToken string is required." },
			{ status: 400 },
		);
	}

	try {
		const refreshed = await refreshGoogleAccessToken({
			refreshToken,
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		});

		const expiresAt = Date.now() + refreshed.expires_in * 1000;

		return NextResponse.json({
			accessToken: refreshed.access_token,
			expiresAt,
		});
	} catch (error) {
		console.error("YouTube token refresh error:", error);
		return NextResponse.json(
			{
				error: "refresh_failed",
				message: error instanceof Error ? error.message : "Failed to refresh token",
			},
			{ status: 500 },
		);
	}
}
