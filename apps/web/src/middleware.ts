import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
	"/",
	"/docs(.*)",
	"/sign-in(.*)",
	"/sign-up(.*)",
	"/brand",
	"/changelog(.*)",
	"/roadmap",
	"/privacy",
	"/terms",
	"/robots.txt",
	"/sitemap.xml",
	"/manifest.json",
	"/manifest.webmanifest",
	"/favicon.ico",
	"/browserconfig.xml",
	"/api/health",
	"/api/ai/(.*)",
	"/api/publish/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
	// If publishable key is not set, allow requests to proceed offline/in local development
	if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
		return;
	}

	if (!isPublicRoute(request)) {
		await auth.protect();
	}
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files
		"/((?!_next|[^?]*\\.(?:html?|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
