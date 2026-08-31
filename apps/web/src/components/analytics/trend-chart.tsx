"use client";

import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";

export interface TrendPoint {
	label: string;
	value: number | null;
}

export interface TrendChartProps {
	title: string;
	data: TrendPoint[];
	/** Formats the y/tooltip value (e.g. "12.3k" or "14.2%"). */
	formatValue?: (value: number) => string;
	height?: number;
}

const compact = (value: number): string =>
	new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
		value,
	);

/** Simple single-series line chart used across the Overview page. */
export function TrendChart({ title, data, formatValue = compact, height = 220 }: TrendChartProps) {
	const hasData = data.some((point) => point.value !== null);
	return (
		<Card>
			<CardContent className="p-5">
				<h3 className="mb-3 text-sm font-medium">{title}</h3>
				{hasData ? (
					<ResponsiveContainer width="100%" height={height}>
						<LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
							<CartesianGrid strokeDasharray="3 3" opacity={0.2} />
							<XAxis
								dataKey="label"
								tick={{ fontSize: 11 }}
								tickLine={false}
								axisLine={false}
								minTickGap={24}
							/>
							<YAxis
								tick={{ fontSize: 11 }}
								tickLine={false}
								axisLine={false}
								width={48}
								tickFormatter={(value: number) => formatValue(value)}
							/>
							<Tooltip
								formatter={(value) =>
									typeof value === "number" ? formatValue(value) : String(value)
								}
								labelStyle={{ fontSize: 12 }}
								contentStyle={{ borderRadius: 12, fontSize: 12 }}
							/>
							<Line
								type="monotone"
								dataKey="value"
								stroke="var(--color-primary, #6366f1)"
								strokeWidth={2}
								dot={false}
								connectNulls={true}
							/>
						</LineChart>
					</ResponsiveContainer>
				) : (
					<div
						className="text-muted-foreground flex items-center justify-center text-sm"
						style={{ height }}
					>
						No data yet — sync your account to build history.
					</div>
				)}
			</CardContent>
		</Card>
	);
}
