import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
	YOUTUBE_HANDOFF_COOKIE,
	isYouTubeOAuthConfigured,
} from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface YouTubeHandoffPayload {
	accessToken: string;
	refreshToken?: string;
	expiresAt: number;
	channelId: string;
	channelTitle: string;
	channelCustomUrl?: string;
	avatarUrl?: string;
}

/**
 * One-time pickup of the YouTube OAuth handoff cookie set by callback route.
 */
export async function GET(request: NextRequest) {
	if (!isYouTubeOAuthConfigured()) {
		return NextResponse.json(
			{ connected: false, configured: false, message: "YouTube OAuth is not configured." },
			{ status: 200 },
		);
	}

	const raw = request.cookies.get(YOUTUBE_HANDOFF_COOKIE)?.value;
	if (!raw) {
		return NextResponse.json(
			{ connected: false, configured: true, message: "No pending YouTube handoff." },
			{ status: 200 },
		);
	}

	let payload: YouTubeHandoffPayload;
	try {
		payload = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
	} catch {
		const res = NextResponse.json(
			{ connected: false, error: "bad_handoff", message: "YouTube handoff cookie unreadable." },
			{ status: 200 },
		);
		res.cookies.set(YOUTUBE_HANDOFF_COOKIE, "", { path: "/", maxAge: 0 });
		return res;
	}

	const response = NextResponse.json({
		connected: true,
		configured: true,
		accessToken: payload.accessToken,
		refreshToken: payload.refreshToken,
		expiresAt: payload.expiresAt,
		channelId: payload.channelId,
		channelTitle: payload.channelTitle,
		channelCustomUrl: payload.channelCustomUrl,
		avatarUrl: payload.avatarUrl,
	});

	// Burn the one-time cookie
	response.cookies.set(YOUTUBE_HANDOFF_COOKIE, "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 0,
	});

	return response;
}
