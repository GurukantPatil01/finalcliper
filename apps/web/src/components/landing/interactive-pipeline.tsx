"use client";

import { useState } from "react";
import { ArrowRight, Check, Sparkles, Terminal, Video, Layers, Wand2 } from "lucide-react";

interface PipelineStep {
	step: string;
	title: string;
	agent: string;
	description: string;
	codeSample: string;
	metrics: string;
}

const STEPS: PipelineStep[] = [
	{
		step: "01",
		title: "TREND & NICHE ANALYSIS",
		agent: "Gemini 3.6 Flash Agent",
		description:
			"Extracts high-performing narrative formats, hooks, retention pacing, and sound cues for short-form video engagement.",
		codeSample: `{
  "agent": "trend-analyzer",
  "niche": "Tech Hardware Breakdown",
  "targetDurationSec": 30,
  "retentionStrategy": "high_contrast_hook",
  "pacingBpm": 128
}`,
		metrics: "Latency: 280ms // Tokens: 420",
	},
	{
		step: "02",
		title: "SCENE SCRIPT & VISUAL PROMPTS",
		agent: "Script Writer + Storyboarder",
		description:
			"Builds structured scenes with narration text, word-level audio timestamps, and calibrated cinematography prompts for Veo.",
		codeSample: `{
  "sceneIndex": 1,
  "visualPrompt": "Cinematic macro shot of glowing circuit board with neon blue traces, 4k ultra-detailed",
  "voiceover": "Inside this chip lies the future of on-device neural processing.",
  "durationSeconds": 5.0
}`,
		metrics: "Scenes: 4 // Duration: 24.5s",
	},
	{
		step: "03",
		title: "GOOGLE VEO GENERATION",
		agent: "Veo 3.1 Async LRO Service",
		description:
			"Dispatches long-running video generation requests, polls completion status, and streams high-definition MP4 chunks to the client.",
		codeSample: `// POST /api/ai/video
const operation = await ai.models.generateVideos({
  model: "veo-3.1-lite-generate-preview",
  prompt: visualPrompt,
  config: { aspectRatio: "9:16", numberOfVideos: 1 }
});
// Polling LRO -> streaming binary MP4`,
		metrics: "Resolution: 1080x1920 // 24 FPS",
	},
	{
		step: "04",
		title: "RUST/WGPU TIMELINE COMPOSITING",
		agent: "Local WASM Engine Core",
		description:
			"Assembles video clips, audio voiceovers, kinetic auto-captions, and GPU color transforms into the multi-track timeline ready for export.",
		codeSample: `// packages/editor-core
const clip = editorCore.timeline.createClip({
  trackId: "video-track-1",
  source: videoBlob,
  start: 0,
  duration: 5000
});
editorCore.renderGraph.recompute();`,
		metrics: "Frame Render: 16.6ms // 0ms Network",
	},
];

export function InteractivePipeline() {
	const [activeStepIndex, setActiveStepIndex] = useState(0);
	const activeStep = STEPS[activeStepIndex];

	return (
		<section className="w-full border-b border-neutral-800 bg-neutral-950 text-white">
			<div className="mx-auto max-w-7xl border-x border-neutral-800">
				{/* Section Header */}
				<div className="flex flex-col justify-between border-b border-neutral-800 p-6 sm:flex-row sm:items-center sm:px-10">
					<div>
						<div className="font-mono text-xs text-neutral-500">[ WORKFLOW_GRAPH ]</div>
						<h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
							END-TO-END SYNTHESIS PIPELINE
						</h2>
					</div>
					<div className="mt-2 font-mono text-xs text-neutral-400 sm:mt-0">
						INPUT PROMPT &rarr; TIMELINE COMPOSITION
					</div>
				</div>

				{/* 4-Step Nav Bar */}
				<div className="grid grid-cols-2 border-b border-neutral-800 sm:grid-cols-4">
					{STEPS.map((s, idx) => {
						const isActive = idx === activeStepIndex;
						return (
							<button
								key={s.step}
								type="button"
								onClick={() => setActiveStepIndex(idx)}
								className={`flex flex-col items-start border-r border-neutral-800 p-4 text-left font-mono transition-colors last:border-r-0 sm:p-6 ${
									isActive
										? "border-b-2 border-b-white bg-black text-white"
										: "bg-neutral-950 text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300"
								}`}
							>
								<div className="flex items-center gap-2 text-xs">
									<span className={isActive ? "text-white" : "text-neutral-600"}>
										[{s.step}]
									</span>
									<span className="text-[10px] tracking-wider uppercase">STAGE</span>
								</div>
								<div className="mt-2 text-xs font-bold tracking-tight sm:text-sm">
									{s.title}
								</div>
							</button>
						);
					})}
				</div>

				{/* Step Content Preview */}
				<div className="grid grid-cols-1 lg:grid-cols-12">
					{/* Explanation (6 cols) */}
					<div className="flex flex-col justify-between border-b border-neutral-800 p-6 sm:p-10 lg:col-span-6 lg:border-r lg:border-b-0">
						<div>
							<div className="inline-flex items-center gap-2 border border-neutral-800 bg-black px-3 py-1 font-mono text-[11px] text-neutral-400">
								<span className="size-1.5 bg-white" />
								<span>STAGE {activeStep.step} // {activeStep.agent}</span>
							</div>

							<h3 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
								{activeStep.title}
							</h3>

							<p className="mt-4 text-base leading-relaxed text-neutral-400">
								{activeStep.description}
							</p>
						</div>

						<div className="mt-8 border-t border-neutral-800 pt-4 font-mono text-xs text-neutral-500">
							<span className="text-neutral-400">STATUS:</span> {activeStep.metrics}
						</div>
					</div>

					{/* Technical Code / Payload Inspector (6 cols) */}
					<div className="bg-black p-6 font-mono text-xs text-neutral-300 sm:p-10 lg:col-span-6">
						<div className="flex items-center justify-between border-b border-neutral-800 pb-3 text-neutral-500">
							<div className="flex items-center gap-2">
								<Terminal className="size-3.5" />
								<span>PAYLOAD_INSPECTOR</span>
							</div>
							<span className="text-[10px] text-emerald-400">SYNTH_STREAM_OK</span>
						</div>

						<pre className="mt-4 overflow-x-auto rounded border border-neutral-900 bg-neutral-950 p-4 text-[12px] leading-relaxed text-neutral-300">
							<code>{activeStep.codeSample}</code>
						</pre>

						<div className="mt-4 flex items-center justify-between text-[11px] text-neutral-500">
							<span>FORMAT: JSON // UTF-8</span>
							<span>TARGET: packages/editor-core</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
