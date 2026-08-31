"use client";

import { Cpu, Film, Sparkles, Layers, Volume2, ShieldCheck, Zap, Share2 } from "lucide-react";

interface FeatureBlock {
	index: string;
	title: string;
	tag: string;
	description: string;
	specs: string[];
	icon: React.ElementType;
}

const FEATURES: FeatureBlock[] = [
	{
		index: "01",
		title: "LOCAL-FIRST RUST & WGPU ENGINE",
		tag: "CORE COMPOSITOR",
		description:
			"The entire editing engine runs directly in the client via WebAssembly and WebGPU. Timeline operations, ripple edits, transforms, and color shaders execute at 60fps with zero server lag.",
		specs: ["WASM + WGPU Shaders", "Sub-frame timeline accuracy", "100% offline capable"],
		icon: Cpu,
	},
	{
		index: "02",
		title: "GOOGLE VEO 3.1 & GEMINI SYNTHESIS",
		tag: "AI STUDIO PIPELINE",
		description:
			"Generate complete high-production videos from scratch. Gemini scripts your scenes, hooks, and narration, while Google Veo generates high-definition video visual beds directly on your timeline tracks.",
		specs: ["Veo 3.1 / 2.0 generative video", "Gemini 3.6 flash script agent", "Async LRO streaming"],
		icon: Sparkles,
	},
	{
		index: "03",
		title: "ON-DEVICE SPEECH & 24KHZ TTS",
		tag: "AUDIO INTELLIGENCE",
		description:
			"Auto-captions generated locally via Whisper transformers with zero audio sent to the cloud. Layer synchronized TTS voiceovers with word-level alignment across multi-track audio buses.",
		specs: ["Local Whisper transcription", "Gemini 24kHz PCM TTS", "Word-level kinetic captions"],
		icon: Volume2,
	},
	{
		index: "04",
		title: "FROZEN EDL V1 & SOCIAL EXPORT",
		tag: "OPEN STANDARDS",
		description:
			"Never get locked into a proprietary editing format. Export to standardized EDL v1 JSON, render hardware-accelerated 4K MP4s, or publish directly to Instagram Reels with performance telemetry.",
		specs: ["Frozen schema/edl-v1.json", "Hardware encoder pipeline", "Instagram Graph API"],
		icon: Share2,
	},
];

export function BrutalistFeatures() {
	return (
		<section className="w-full border-b border-neutral-800 bg-black text-white">
			<div className="mx-auto max-w-7xl border-x border-neutral-800">
				{/* Section Header Strip */}
				<div className="flex flex-col justify-between border-b border-neutral-800 p-6 sm:flex-row sm:items-center sm:px-10">
					<div className="flex items-center gap-3">
						<span className="font-mono text-xs font-bold text-neutral-500">[ SYSTEM_SPEC ]</span>
						<h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
							CORE CAPABILITIES & ARCHITECTURE
						</h2>
					</div>
					<div className="mt-2 font-mono text-xs text-neutral-500 sm:mt-0">
						4 INTEGRATED MODULES // ZERO CLOUD DEPENDENCY
					</div>
				</div>

				{/* 4-Block Brutalist Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2">
					{FEATURES.map((feature, idx) => {
						const Icon = feature.icon;
						const isRight = idx % 2 === 1;
						const isBottom = idx >= 2;

						return (
							<div
								key={feature.index}
								className={`group relative flex flex-col justify-between border-b border-neutral-800 p-6 transition-colors duration-150 hover:bg-neutral-950 sm:p-10 ${
									!isRight ? "md:border-r" : ""
								}`}
							>
								<div>
									{/* Index & Tag Header */}
									<div className="flex items-center justify-between font-mono text-xs text-neutral-500">
										<span className="font-bold text-white">[{feature.index}]</span>
										<span className="border border-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400 uppercase">
											{feature.tag}
										</span>
									</div>

									{/* Icon & Title */}
									<div className="mt-6 flex items-center gap-3">
										<div className="flex size-8 items-center justify-center border border-neutral-800 bg-neutral-900 text-white transition-colors group-hover:border-white">
											<Icon className="size-4" />
										</div>
										<h3 className="text-lg font-bold tracking-tight text-neutral-100 sm:text-xl">
											{feature.title}
										</h3>
									</div>

									{/* Description */}
									<p className="mt-4 text-sm leading-relaxed text-neutral-400">
										{feature.description}
									</p>
								</div>

								{/* Technical Specs List */}
								<div className="mt-8 border-t border-neutral-900 pt-4 font-mono text-xs">
									<div className="text-[10px] text-neutral-600 uppercase">TECHNICAL PARAMETERS:</div>
									<div className="mt-2 flex flex-wrap gap-2">
										{feature.specs.map((spec) => (
											<span
												key={spec}
												className="border border-neutral-800 bg-black px-2 py-1 text-[11px] text-neutral-300"
											>
												+ {spec}
											</span>
										))}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
