import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
	InstagramTokenError,
	refreshLongLivedToken,
} from "@/analytics/graph-client";
import {
	extractIgToken,
	instagramDisabledResponse,
	isInstagramOAuthConfigured,
	tokenRequiredResponse,
} from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface RefreshResponse {
	accessToken: string;
	/** Milliseconds since epoch when the new token expires. */
	expiresAt: number;
}

/**
 * Renews an unexpired long-lived token.
 */
export async function POST(request: NextRequest) {
	if (!isInstagramOAuthConfigured()) {
		return instagramDisabledResponse();
	}

	const token = extractIgToken(request);
	if (!token) return tokenRequiredResponse();

	try {
		const refreshed = await refreshLongLivedToken(token);
		const response: RefreshResponse = {
			accessToken: refreshed.accessToken,
			expiresAt: Date.now() + refreshed.expiresIn * 1000,
		};
		return NextResponse.json(response);
	} catch (error) {
		if (error instanceof InstagramTokenError) {
			return NextResponse.json(
				{
					error: "ig_token_invalid",
					message: "Instagram could not refresh this token — please reconnect the account.",
				},
				{ status: 401 },
			);
		}
		const message =
			error instanceof Error ? error.message : "Unknown token refresh error.";
		return NextResponse.json({ error: "ig_refresh_failed", message }, { status: 502 });
	}
}
