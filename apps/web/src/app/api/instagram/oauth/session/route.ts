import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
	IG_HANDOFF_COOKIE,
	IG_LEGACY_HANDOFF_COOKIE,
	instagramDisabledResponse,
	isInstagramOAuthConfigured,
} from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HandoffPayload {
	accessToken: string;
	expiresAt: number;
	userId: string;
	username?: string;
}

/**
 * One-time pickup of the OAuth handoff cookie set by the callback route.
 * Returns the token payload (the client stores it in localStorage) and
 * clears the cookies so the token cannot be re-read.
 */
export async function GET(request: NextRequest) {
	if (!isInstagramOAuthConfigured()) {
		return NextResponse.json(
			{ connected: false, configured: false, message: "Instagram OAuth is not configured." },
			{ status: 200 },
		);
	}
	const raw =
		request.cookies.get(IG_HANDOFF_COOKIE)?.value ||
		request.cookies.get(IG_LEGACY_HANDOFF_COOKIE)?.value;

	if (!raw) {
		return NextResponse.json(
			{ connected: false, configured: true, message: "No pending Instagram handoff." },
			{ status: 200 },
		);
	}
	let payload: HandoffPayload;
	try {
		payload = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
	} catch {
		const res = NextResponse.json(
			{ connected: false, error: "bad_handoff", message: "Instagram handoff cookie was unreadable." },
			{ status: 200 },
		);
		res.cookies.set(IG_HANDOFF_COOKIE, "", { path: "/", maxAge: 0 });
		res.cookies.set(IG_LEGACY_HANDOFF_COOKIE, "", { path: "/", maxAge: 0 });
		return res;
	}

	const response = NextResponse.json({
		connected: true,
		configured: true,
		accessToken: payload.accessToken,
		expiresAt: payload.expiresAt,
		userId: payload.userId,
		username: payload.username,
	});

	response.cookies.set(IG_HANDOFF_COOKIE, "", { path: "/", maxAge: 0 });
	response.cookies.set(IG_LEGACY_HANDOFF_COOKIE, "", { path: "/", maxAge: 0 });
	return response;
}
