import Link from "next/link";
import { Button } from "@/components/ui/button";

/* ─────────────────────────────────────────────────────────────────────────
   Editorial workflow sections — a numbered editorial list (not a card grid)
   describing the real pipeline: import → agent rough cut → timeline craft →
   local export / publish. Copy only references capabilities that exist in
   the application (mediabunny import, AI copilot + analysis agents, EDL v1
   multitrack timeline, local MP4 export, Instagram/YouTube/TikTok publish).
   ─────────────────────────────────────────────────────────────────────── */

const STEPS = [
	{
		n: "01",
		title: "Import to the bin",
		body: "Drop footage, audio and images into the media panel. Everything is decoded and stored on-device — projects live in your browser's local database, not someone else's cloud.",
		meta: ["Local-first storage", "Video · audio · images"],
	},
	{
		n: "02",
		title: "Let the agents rough-cut",
		body: "The AI copilot analyzes scenes, finds hooks and transcribes speech with on-device models, then writes an edit decision list straight into your timeline. You keep every cut it makes — or undo them one by one.",
		meta: ["Gemini + on-device ASR", "Frozen EDL v1 contract"],
	},
	{
		n: "03",
		title: "Craft on the timeline",
		body: "A proper multitrack timeline: ripple edits, snapping, keyframes, masks, kinetic captions and audio ducking — rendered by a Rust/WGPU compositor at full frame density.",
		meta: ["Multitrack + waveforms", "Rust GPU compositor"],
	},
	{
		n: "04",
		title: "Export and publish",
		body: "Render MP4 locally, then send it to Instagram, YouTube or TikTok from the same window. Native pipelines on mobile; nothing round-trips through a server.",
		meta: ["Local MP4 export", "IG · YouTube · TikTok"],
	},
];

export function EditorialWorkflow() {
	return (
		<section className="border-b border-border">
			<div className="mx-auto max-w-[88rem] px-6 py-20 lg:px-10 lg:py-28">
				<div className="grid gap-14 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-20">
					<header>
						<p className="editorial-label text-muted-foreground">The workflow</p>
						<h2 className="display-section mt-4 text-foreground">
							Four moves,
							<br />
							start to <span className="text-primary">final cut</span>.
						</h2>
						<p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground">
							FinalCliper is one continuous surface — discovery, assembly and
							finish never leave the workspace.
						</p>
					</header>

					<ol className="divide-y divide-border border-y border-border">
						{STEPS.map((s) => (
							<li key={s.n} className="grid gap-3 py-8 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-8">
								<span className="tabular text-sm font-semibold text-primary">{s.n}</span>
								<div>
									<h3 className="text-lg font-semibold tracking-tight text-foreground">{s.title}</h3>
									<p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{s.body}</p>
									<ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
										{s.meta.map((m) => (
											<li key={m} className="editorial-label text-muted-foreground/80">
												{m}
											</li>
										))}
									</ul>
								</div>
							</li>
						))}
					</ol>
				</div>
			</div>
		</section>
	);
}

/* Closing call to action — deliberately quiet, typographic. */
export function EditorialCta() {
	return (
		<section>
			<div className="mx-auto flex max-w-[88rem] flex-col gap-8 px-6 py-24 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:py-32">
				<div>
					<p className="editorial-label text-muted-foreground">Start cutting</p>
					<h2 className="display-section mt-4 max-w-2xl text-foreground">
						The first rough cut is{" "}
						<span className="text-primary">minutes</span> away.
					</h2>
				</div>
				<div className="flex shrink-0 items-center gap-3">
					<Link href="/projects">
						<Button size="lg" className="rounded-sm px-8 font-medium">
							Open Projects
						</Button>
					</Link>
					<Link href="/roadmap">
						<Button
							size="lg"
							variant="ghost"
							className="rounded-sm border border-border px-5 font-medium text-foreground hover:bg-accent"
						>
							Roadmap
						</Button>
					</Link>
				</div>
			</div>
		</section>
	);
}
