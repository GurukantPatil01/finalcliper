"use client";

import Link from "next/link";
import { ArrowRight, Play, Terminal, Cpu, Sparkles, Layers, ShieldCheck } from "lucide-react";
import { RadialEngineGraph } from "./radial-engine-graph";

export function MinimalHero() {
	return (
		<section className="relative min-h-[calc(100vh-4.5rem)] w-full border-b border-neutral-800 bg-black text-white">
			{/* Subtle technical background grid */}
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#171717_1px,transparent_1px),linear-gradient(to_bottom,#171717_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-30" />

			{/* Main Grid: Left Typography & Right Interactive Radial Graph */}
			<div className="relative mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-7xl grid-cols-1 border-x border-neutral-800 lg:grid-cols-12">
				
				{/* Left Column: Product Information & CTAs (7 cols) */}
				<div className="flex flex-col justify-between border-b border-neutral-800 p-6 sm:p-10 lg:col-span-7 lg:border-r lg:border-b-0">
					<div>
						{/* System Status Tag */}
						<div className="inline-flex items-center gap-2 border border-neutral-800 bg-neutral-950 px-3 py-1 font-mono text-[11px] tracking-wider text-neutral-400 uppercase">
							<span className="size-1.5 animate-pulse bg-emerald-400" />
							<span>SYS_V1.0 // LOCAL-FIRST & VEO VIDEO ENGINE</span>
						</div>

						{/* Brutalist Bold Headline */}
						<div className="mt-8">
							<h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
								Video intelligence,
								<br />
								<span className="text-neutral-500">on demand.</span>
							</h1>
						</div>

						{/* Crisp Explanation */}
						<p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg">
							Cut, composite, caption, and synthesize. Powered by an on-device Rust
							and WebGPU editing engine, augmented with Google Veo and Gemini
							generative intelligence — 100% private with zero cloud lock-in.
						</p>

						{/* Minimal Brutalist Action Buttons */}
						<div className="mt-8 flex flex-wrap items-center gap-4">
							<Link href="/projects">
								<button
									type="button"
									className="group inline-flex h-12 items-center gap-3 border border-white bg-white px-6 font-mono text-xs font-bold tracking-wider text-black uppercase transition-all duration-150 hover:bg-neutral-200 active:scale-95"
								>
									<span className="flex size-4 items-center justify-center bg-black text-white">
										<Play className="size-2.5 fill-current" />
									</span>
									<span>LAUNCH STUDIO</span>
									<ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-1" />
								</button>
							</Link>

							<Link href="/editor">
								<button
									type="button"
									className="inline-flex h-12 items-center gap-2 border border-neutral-800 bg-neutral-950 px-6 font-mono text-xs font-medium tracking-wider text-neutral-300 uppercase transition-colors duration-150 hover:border-neutral-600 hover:text-white"
								>
									<span>[ 01 ] OPEN TIMELINE</span>
								</button>
							</Link>
						</div>
					</div>

					{/* Technical Telemetry Badges */}
					<div className="mt-12 grid grid-cols-2 gap-4 border-t border-neutral-800 pt-6 sm:grid-cols-4">
						<div>
							<div className="font-mono text-[10px] text-neutral-500 uppercase">LATENCY</div>
							<div className="mt-1 font-mono text-xs font-semibold text-neutral-200">0ms (OFFLINE)</div>
						</div>
						<div>
							<div className="font-mono text-[10px] text-neutral-500 uppercase">ENGINE CORE</div>
							<div className="mt-1 font-mono text-xs font-semibold text-neutral-200">RUST / WGPU</div>
						</div>
						<div>
							<div className="font-mono text-[10px] text-neutral-500 uppercase">VIDEO AI</div>
							<div className="mt-1 font-mono text-xs font-semibold text-neutral-200">GOOGLE VEO 3.1</div>
						</div>
						<div>
							<div className="font-mono text-[10px] text-neutral-500 uppercase">SCHEMA</div>
							<div className="mt-1 font-mono text-xs font-semibold text-neutral-200">EDL V1 FROZEN</div>
						</div>
					</div>
				</div>

				{/* Right Column: Radial Engine Constellation Graph (5 cols) */}
				<div className="relative flex flex-col items-center justify-center bg-neutral-950/40 p-4 lg:col-span-5">
					{/* Coordinate Marks */}
					<div className="pointer-events-none absolute top-4 left-4 font-mono text-[10px] text-neutral-600">
						+ [COORD: 00:00:00:00]
					</div>
					<div className="pointer-events-none absolute top-4 right-4 font-mono text-[10px] text-neutral-600">
						+ [NODE_GRAPH: LIVE]
					</div>
					<div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[10px] text-neutral-600">
						+ [BUFFER: 60FPS]
					</div>
					<div className="pointer-events-none absolute right-4 bottom-4 font-mono text-[10px] text-neutral-600">
						+ [WASM_MEM: OK]
					</div>

					<RadialEngineGraph />
				</div>
			</div>
		</section>
	);
}
