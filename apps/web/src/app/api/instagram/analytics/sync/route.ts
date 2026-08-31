import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
	fetchAccountMetrics,
	fetchReelsWithInsights,
	InstagramTokenError,
} from "@/analytics/graph-client";
import type { AccountMetrics, ReelMetrics } from "@/analytics/types";
import {
	analyticsDisabledResponse,
	extractIgToken,
	tokenRequiredResponse,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // per-reel insight fetches can take a while

export interface SyncResponse {
	syncedAt: string;
	account: AccountMetrics;
	reels: ReelMetrics[];
}

/** Pulls account + reels + per-reel insights. Snapshots persist client-side. */
export async function POST(request: NextRequest) {
	const enabled = process.env.NEXT_PUBLIC_IG_ANALYTICS_ENABLED === "true";
	if (!enabled) return analyticsDisabledResponse();

	const token = extractIgToken(request);
	if (!token) return tokenRequiredResponse();

	try {
		const [account, reels] = await Promise.all([
			fetchAccountMetrics(token),
			fetchReelsWithInsights(token),
		]);
		const response: SyncResponse = {
			syncedAt: new Date().toISOString(),
			account,
			reels,
		};
		return NextResponse.json(response);
	} catch (error) {
		if (error instanceof InstagramTokenError) {
			return NextResponse.json(
				{
					error: "ig_token_invalid",
					message:
						"Instagram rejected your access token. Reconnect the account in Settings → Analytics.",
				},
				{ status: 401 },
			);
		}
		const message =
			error instanceof Error ? error.message : "Unknown Instagram sync error.";
		return NextResponse.json({ error: "ig_sync_failed", message }, { status: 502 });
	}
}
