"use client";

import Link from "next/link";
import { ArrowRight, Play, Github, CheckCircle2, Shield } from "lucide-react";

export function BrutalistCta() {
	return (
		<section className="w-full bg-black text-white">
			<div className="mx-auto max-w-7xl border-x border-neutral-800">
				<div className="p-8 sm:p-16 lg:p-20">
					<div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
						<div>
							<div className="inline-flex items-center gap-2 border border-neutral-800 bg-neutral-950 px-3 py-1 font-mono text-[11px] text-neutral-400">
								<span className="size-1.5 bg-emerald-400" />
								<span>READY FOR WORK // INSTANT LOCAL BOOT</span>
							</div>

							<h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
								Cut your first scene.
								<br />
								<span className="text-neutral-500">Zero install. Zero lag.</span>
							</h2>

							<p className="mt-4 max-w-xl text-base text-neutral-400 sm:text-lg">
								Full multi-track timeline, on-device Whisper captions, GPU shader
								effects, and Google Veo generative video clips.
							</p>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row">
							<Link href="/projects">
								<button
									type="button"
									className="group inline-flex h-12 items-center gap-3 border border-white bg-white px-8 font-mono text-xs font-bold tracking-wider text-black uppercase transition-all hover:bg-neutral-200 active:scale-95"
								>
									<span className="flex size-4 items-center justify-center bg-black text-white">
										<Play className="size-2.5 fill-current" />
									</span>
									<span>LAUNCH STUDIO</span>
									<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
								</button>
							</Link>

							<Link href="/roadmap">
								<button
									type="button"
									className="inline-flex h-12 items-center gap-2 border border-neutral-800 bg-neutral-950 px-6 font-mono text-xs font-medium tracking-wider text-neutral-300 uppercase transition-colors hover:border-neutral-600 hover:text-white"
								>
									<span>[ 02 ] ROADMAP</span>
								</button>
							</Link>
						</div>
					</div>

					{/* Technical Security & Offline Guarantee Strip */}
					<div className="mt-16 grid grid-cols-1 gap-6 border-t border-neutral-800 pt-8 sm:grid-cols-3">
						<div className="flex items-start gap-3">
							<Shield className="mt-0.5 size-4 text-neutral-400" />
							<div>
								<div className="font-mono text-xs font-bold text-white">100% PRIVATE DATA</div>
								<p className="mt-1 text-xs text-neutral-500">
									Media and project files stay on your machine. IndexedDB storage.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3">
							<CheckCircle2 className="mt-0.5 size-4 text-neutral-400" />
							<div>
								<div className="font-mono text-xs font-bold text-white">ZERO CLOUD LOCK-IN</div>
								<p className="mt-1 text-xs text-neutral-500">
									Frozen EDL v1 specification guarantees native platform interoperability.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3">
							<div className="mt-0.5 flex size-4 items-center justify-center border border-neutral-700 font-mono text-[9px] text-neutral-300">
								&gt;
							</div>
							<div>
								<div className="font-mono text-xs font-bold text-white">OPEN ENGINE</div>
								<p className="mt-1 text-xs text-neutral-500">
									Modular headless core in <code className="text-neutral-300">packages/editor-core</code>.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
