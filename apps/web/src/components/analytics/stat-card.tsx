"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/ui";

export interface StatCardProps {
	label: string;
	value: string;
	hint?: string;
	/** Signed delta displayed as a colored badge (e.g. "+12", "-3%"). */
	delta?: string | null;
	deltaPositive?: boolean;
}

export function StatCard({ label, value, hint, delta, deltaPositive }: StatCardProps) {
	return (
		<Card>
			<CardContent className="flex flex-col gap-1 p-5">
				<span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					{label}
				</span>
				<span className="text-2xl font-semibold">{value}</span>
				<span className="flex min-h-5 items-center gap-2">
					{delta ? (
						<span
							className={cn(
								"rounded-full px-2 py-0.5 text-xs font-medium",
								deltaPositive
									? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
									: "bg-red-500/15 text-red-600 dark:text-red-400",
							)}
						>
							{delta}
						</span>
					) : null}
					{hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
				</span>
			</CardContent>
		</Card>
	);
}
