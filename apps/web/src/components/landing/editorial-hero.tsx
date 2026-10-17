import Link from "next/link";
import { Button } from "@/components/ui/button";

/* ─────────────────────────────────────────────────────────────────────────
   EditorialHero — warm-ivory landing hero with an asymmetric type block and
   a stylised-but-faithful preview of the real FinalCliper editing workspace
   (top bar · media bin · preview canvas · multitrack timeline · inspector).
   The preview is decorative (aria-hidden) but depicts only controls that
   exist in the actual editor.
   ─────────────────────────────────────────────────────────────────────── */

export function EditorialHero() {
	return (
		<section className="border-b border-border">
			<div className="mx-auto grid max-w-[88rem] grid-cols-1 gap-16 px-6 pb-20 pt-16 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12 lg:px-10 lg:pb-28 lg:pt-24">
				{/* Type column */}
				<div className="flex flex-col justify-center">
					<p className="editorial-label text-muted-foreground">
						FinalCliper — Local-first video studio
					</p>
					<h1 className="display-hero mt-6 text-foreground">
						Editorial calm.
						<br />
						<span className="text-primary">Cinematic</span> cut.
					</h1>
					<p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
						A multitrack editor with a Rust GPU compositor that runs entirely on
						your machine — plus Gemini-powered agents that find the hook, write
						the script and lay the rough cut into your timeline.
					</p>
					<div className="mt-9 flex flex-wrap items-center gap-3">
						<Link href="/projects">
							<Button size="lg" className="rounded-sm px-7 font-medium">
								Open Projects
							</Button>
						</Link>
						<Link href="/docs">
							<Button
								size="lg"
								variant="ghost"
								className="rounded-sm border border-border px-5 font-medium text-foreground hover:bg-accent"
							>
								Read the docs
							</Button>
						</Link>
					</div>
					<p className="mt-8 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
						Your media never leaves the device. Export, captions and playback are
						handled by the local engine; generative features run only when you
						add your own API key.
					</p>
				</div>

				{/* Product preview */}
				<div className="relative min-w-0 self-center">
					<EditorPreview />
				</div>
			</div>
		</section>
	);
}

/* Faithful miniature of the editor workspace. Static markup, no fake interactivity. */
function EditorPreview() {
	const rulerMarks = Array.from({ length: 13 }, (_, i) => i);
	return (
		<figure
			aria-hidden="true"
			className="dark select-none overflow-hidden rounded-md border border-border bg-background text-card-foreground shadow-xl shadow-black/20"
		>
			{/* Top application bar */}
			<div className="flex h-9 items-center justify-between border-b border-border px-3">
				<div className="flex items-center gap-3">
					<span className="size-2.5 rounded-[2px] bg-primary" />
					<span className="text-[10px] font-semibold tracking-wide">FinalCliper</span>
					<span className="h-3.5 w-px bg-border" />
					<span className="text-[10px] text-muted-foreground">Sunset reel · v4</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="rounded-[2px] border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
						Saved locally
					</span>
					<span className="rounded-[2px] bg-primary px-2.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
						Export
					</span>
				</div>
			</div>

			<div className="flex h-[26rem] sm:h-[30rem]">
				{/* Media bin */}
				<div className="hidden w-36 shrink-0 flex-col border-r border-border md:flex">
					<div className="border-b border-border px-2.5 py-1.5 text-[9px] tracking-widest text-muted-foreground uppercase">
						Media
					</div>
					<div className="space-y-1 p-1.5">
						{[
							["sunset_aerial.mp4", "clip-video"],
							["interview_01.mov", "clip-video"],
							["broll_city.mp4", "clip-video"],
							["voiceover.wav", "clip-audio"],
							["hook_caption.txt", "clip-caption"],
						].map(([name, tone]) => (
							<div key={name} className="flex items-center gap-1.5 rounded-[2px] px-1 py-1 hover:bg-accent">
								<span className={`h-5 w-7 shrink-0 rounded-[2px] ${tone}`} />
								<span className="truncate text-[9px] text-muted-foreground">{name}</span>
							</div>
						))}
					</div>
					<div className="mt-auto border-t border-border px-2.5 py-2 text-[9px] text-muted-foreground">
						5 items · 00:47:12
					</div>
				</div>

				{/* Center column: preview + timeline */}
				<div className="flex min-w-0 flex-1 flex-col">
					{/* Preview canvas */}
					<div className="flex min-h-0 flex-1 items-center justify-center bg-[hsl(40_8%_5%)] p-4">
						<div className="relative aspect-video max-h-full w-full max-w-lg overflow-hidden rounded-[2px] border border-border">
							<div className="absolute inset-0 bg-[linear-gradient(160deg,hsl(35_30%_28%),hsl(10_40%_18%)_60%,hsl(40_8%_8%)_60.2%,hsl(40_8%_6%)_100%)]">
								<div className="absolute top-[38%] left-1/2 size-14 -translate-x-1/2 rounded-full bg-[hsl(30_80%_60%)] opacity-80 blur-[2px]" />
							</div>
							{/* caption overlay element */}
							<div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-[2px] bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white">
								THE GOLDEN HOUR RULE
							</div>
							<div className="absolute top-2 left-2 rounded-[2px] border border-white/20 px-1 py-0.5 text-[8px] tracking-widest text-white/70 uppercase">
								9:16 · 1080p
							</div>
						</div>
					</div>

					{/* Transport */}
					<div className="flex h-8 items-center justify-center gap-3 border-y border-border">
						<span className="tabular text-[10px] text-muted-foreground">00:00:12:07</span>
						<span className="flex size-5 items-center justify-center rounded-[2px] bg-primary text-[8px] text-primary-foreground">
							▶
						</span>
						<span className="tabular text-[10px] text-muted-foreground">00:00:47:12</span>
					</div>

					{/* Timeline */}
					<div className="h-40 shrink-0 overflow-hidden">
						{/* ruler */}
						<div className="flex h-5 border-b border-border">
							<div className="w-14 shrink-0 border-r border-border" />
							<div className="relative flex flex-1 items-end justify-between px-1">
								{rulerMarks.map((i) => (
									<span key={i} className="flex flex-col items-center">
										<span className="h-1.5 w-px bg-muted-foreground/50" />
										<span className="tabular text-[7px] text-muted-foreground">
											{i * 4}s
										</span>
									</span>
								))}
							</div>
						</div>

						{/* tracks */}
						<div className="relative">
							{/* playhead */}
							<div className="pointer-events-none absolute top-0 bottom-0 left-[26%] z-10 w-px bg-primary">
								<span className="absolute -top-0 -left-[3px] size-[7px] rounded-[1px] bg-primary" />
							</div>

							<TimelineTrack label="Captions" tone="clip-caption" segments={[[6, 18], [26, 22], [52, 16]]} height="h-6" small />
							<TimelineTrack label="Video 2" tone="clip-text" segments={[[10, 14], [40, 20]]} height="h-7" />
							<TimelineTrack label="Video 1" tone="clip-video" segments={[[0, 34], [36, 28], [66, 30]]} height="h-10" showThumbs />
							<TimelineTrack label="Audio 1" tone="clip-audio" segments={[[0, 62], [64, 32]]} height="h-8" waveform />
						</div>
					</div>
				</div>

				{/* Inspector */}
				<div className="hidden w-40 shrink-0 flex-col border-l border-border lg:flex">
					<div className="border-b border-border px-2.5 py-1.5 text-[9px] tracking-widest text-muted-foreground uppercase">
						Inspector
					</div>
					<div className="space-y-3 p-2.5">
						<InspectorGroup title="Transform">
							<InspectorField label="Scale" value="100%" bar={0.5} />
							<InspectorField label="Opacity" value="100%" bar={1} />
							<InspectorField label="Rotation" value="0°" bar={0} />
						</InspectorGroup>
						<InspectorGroup title="Speed">
							<InspectorField label="Rate" value="1.0×" bar={0.35} />
						</InspectorGroup>
						<InspectorGroup title="Audio">
							<InspectorField label="Volume" value="-3.0 dB" bar={0.72} />
							<InspectorField label="Fade in" value="0.4 s" bar={0.2} />
						</InspectorGroup>
						<div className="mt-2 rounded-[2px] border border-primary/50 px-2 py-1.5 text-[9px] text-primary">
							sunset_aerial.mp4 selected
						</div>
					</div>
				</div>
			</div>
		</figure>
	);
}

function TimelineTrack({
	label,
	tone,
	segments,
	height = "h-8",
	showThumbs = false,
	waveform = false,
	small = false,
}: {
	label: string;
	tone: string;
	segments: [number, number][]; // [left %, width %]
	height?: string;
	showThumbs?: boolean;
	waveform?: boolean;
	small?: boolean;
}) {
	return (
		<div className={`flex border-b border-border/60 ${height}`}>
			<div className="flex w-14 shrink-0 items-center border-r border-border px-1.5">
				<span className={`truncate text-[8px] text-muted-foreground ${small ? "" : ""}`}>{label}</span>
			</div>
			<div className="relative flex-1">
				{segments.map(([left, width], i) => (
					<div
						key={i}
						className={`absolute top-[2px] bottom-[2px] overflow-hidden rounded-[2px] ${tone} ${
							i === 1 && label === "Video 1"
								? "outline-2 -outline-offset-1 outline-[var(--clip-selected)]"
								: "opacity-85"
						}`}
						style={{ left: `${left}%`, width: `${width}%` }}
					>
						{showThumbs && (
							<div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_14px,hsla(40_8%_7%/0.55)_14px,hsla(40_8%_7%/0.55)_15px)]" />
						)}
						{waveform && (
							<div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center gap-[1.5px] px-1">
								{Array.from({ length: 26 }, (_, j) => (
									<span
										key={j}
										className="w-[2px] rounded-[1px] bg-white/60"
										style={{ height: `${4 + ((j * 7) % 11)}px` }}
									/>
								))}
							</div>
						)}
						<span className="absolute top-0.5 left-1 truncate text-[7px] font-medium text-white/85">
							{label === "Captions" ? "— line" : ""}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function InspectorGroup({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div>
			<div className="mb-1.5 text-[8px] tracking-widest text-muted-foreground uppercase">{title}</div>
			<div className="space-y-2">{children}</div>
		</div>
	);
}

function InspectorField({ label, value, bar }: { label: string; value: string; bar: number }) {
	return (
		<div>
			<div className="flex items-baseline justify-between">
				<span className="text-[9px] text-muted-foreground">{label}</span>
				<span className="tabular text-[9px] text-foreground">{value}</span>
			</div>
			<div className="mt-1 h-[3px] rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-foreground/70"
					style={{ width: `${Math.max(bar * 100, 6)}%` }}
				/>
			</div>
		</div>
	);
}
