import { GET as sharedGet } from "../../oauth/session/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Legacy session pickup route for backwards compatibility.
 */
export const GET = sharedGet;
