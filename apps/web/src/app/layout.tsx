import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { baseMetaData } from "./metadata";
import { AuthSyncProvider } from "../components/providers/auth-sync-provider";
import { InstagramOAuthSync } from "../components/providers/instagram-oauth-sync";

export const metadata = baseMetaData;

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider>
			<html lang="en" suppressHydrationWarning>
				<body className="font-sans antialiased">
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						disableTransitionOnChange={true}
					>
						<TooltipProvider>
							<Toaster />
							<InstagramOAuthSync />
							<AuthSyncProvider>{children}</AuthSyncProvider>
						</TooltipProvider>
						<Analytics />
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
