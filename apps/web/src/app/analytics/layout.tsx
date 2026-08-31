"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { cn } from "@/utils/ui";
import { Card, CardContent } from "@/components/ui/card";
import { RiInstagramLine, RiYoutubeLine } from "react-icons/ri";

const IG_NAV = [
	{ label: "Overview", href: "/analytics" },
	{ label: "Reels", href: "/analytics/reels" },
	{ label: "Reports", href: "/analytics/reports" },
	{ label: "Settings", href: "/analytics/settings" },
];

const YT_NAV = [
	{ label: "Overview", href: "/analytics/youtube" },
	{ label: "Videos & Shorts", href: "/analytics/youtube/videos" },
	{ label: "AI Reports", href: "/analytics/youtube/reports" },
	{ label: "Settings", href: "/analytics/youtube/settings" },
];

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const isYouTube = pathname.startsWith("/analytics/youtube");

	const activeNav = isYouTube ? YT_NAV : IG_NAV;

	return (
		<div className="min-h-screen">
			<Header />
			<main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-8">
				<div className="mb-6 flex flex-col gap-5">
					{/* Platform Switcher */}
					<div className="flex items-center justify-between border-b pb-4">
						<div>
							<h1 className="text-2xl font-semibold">
								{isYouTube ? "YouTube Studio Analytics" : "Instagram Reels Analytics"}
							</h1>
							<p className="text-muted-foreground text-sm">
								{isYouTube
									? "Channel growth, watch time, audience retention, and daily AI strategic reports."
									: "Reels performance, engagement trends, and your daily morning agent report."}
							</p>
						</div>

						{/* Platform Toggle Pills */}
						<div className="flex rounded-lg border bg-muted/30 p-1">
							<Link
								href="/analytics"
								className={cn(
									"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
									!isYouTube
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								<RiInstagramLine className="size-4" />
								<span>Instagram</span>
							</Link>

							<Link
								href="/analytics/youtube"
								className={cn(
									"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
									isYouTube
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								<RiYoutubeLine className="size-4 text-red-500" />
								<span>YouTube</span>
							</Link>
						</div>
					</div>

					{/* Sub Navigation Bar */}
					<nav className="flex flex-wrap gap-2">
						{activeNav.map((item) => {
							const isActive =
								item.href === "/analytics"
									? pathname === "/analytics"
									: item.href === "/analytics/youtube"
										? pathname === "/analytics/youtube"
										: pathname.startsWith(item.href);

							return (
								<Link
									key={item.href}
									href={item.href}
									className={cn(
										"rounded-full border px-4 py-1.5 text-sm transition-colors",
										isActive
											? "bg-primary text-primary-foreground border-transparent"
											: "hover:bg-muted",
									)}
								>
									{item.label}
								</Link>
							);
						})}
					</nav>
				</div>

				{children}
			</main>
		</div>
	);
}

