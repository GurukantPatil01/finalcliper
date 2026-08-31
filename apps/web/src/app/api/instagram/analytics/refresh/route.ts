import { POST as sharedPost } from "../../oauth/refresh/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Legacy refresh route for backwards compatibility.
 */
export const POST = sharedPost;
