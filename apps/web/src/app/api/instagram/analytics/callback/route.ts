import type { NextRequest } from "next/server";
import { handleInstagramOAuthCallback } from "../../oauth/callback/route";
import { LEGACY_ANALYTICS_CALLBACK_PATH } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Legacy callback route for backwards compatibility.
 */
export async function GET(request: NextRequest) {
	return handleInstagramOAuthCallback(request, LEGACY_ANALYTICS_CALLBACK_PATH);
}
