"use client";

import React, { useEffect, useRef, useState } from "react";

interface NodeItem {
	id: string;
	label: string;
	category: string;
	description: string;
	angle: number; // in radians
	radiusFactor: number;
	status: string;
}

const NODES: NodeItem[] = [
	{
		id: "veo",
		label: "VEO 3.1 GENERATOR",
		category: "AI SYNTHESIS",
		description: "Google Veo generative text-to-video clip rendering pipeline.",
		angle: 0.1 * Math.PI,
		radiusFactor: 0.88,
		status: "ONLINE",
	},
	{
		id: "gemini",
		label: "GEMINI 3.6 SCRIPTING",
		category: "INTELLIGENCE",
		description: "Trend analysis, structured scene-by-scene viral scripting.",
		angle: 0.35 * Math.PI,
		radiusFactor: 0.84,
		status: "READY",
	},
	{
		id: "tts",
		label: "TTS VOICE SYNTHESIS",
		category: "AUDIO",
		description: "24kHz studio voiceover generation with word-level timestamps.",
		angle: 0.6 * Math.PI,
		radiusFactor: 0.9,
		status: "SYNCED",
	},
	{
		id: "captions",
		label: "ON-DEVICE CAPTIONS",
		category: "AUDIO/ML",
		description: "Local Whisper/Transformers transcription with 0ms network latency.",
		angle: 0.85 * Math.PI,
		radiusFactor: 0.82,
		status: "LOCAL",
	},
	{
		id: "gpu",
		label: "RUST / WGPU ENGINE",
		category: "COMPOSITOR",
		description: "Hardware-accelerated pixel shaders, blend modes, and transforms.",
		angle: 1.15 * Math.PI,
		radiusFactor: 0.86,
		status: "HARDWARE",
	},
	{
		id: "timeline",
		label: "MULTI-TRACK TIMELINE",
		category: "CORE",
		description: "Non-destructive ripple editing, razor cuts, and Bezier speed ramps.",
		angle: 1.4 * Math.PI,
		radiusFactor: 0.88,
		status: "ACTIVE",
	},
	{
		id: "masks",
		label: "SHADER MASKS & FX",
		category: "EFFECTS",
		description: "Keyframed linear, radial, and polygon vector compositing masks.",
		angle: 1.65 * Math.PI,
		radiusFactor: 0.83,
		status: "REALTIME",
	},
	{
		id: "edl",
		label: "EDL V1 EXPORT & REELS",
		category: "OUTPUT",
		description: "Standardized native format export and direct Instagram publishing.",
		angle: 1.9 * Math.PI,
		radiusFactor: 0.89,
		status: "0-LOCKIN",
	},
];

export function RadialEngineGraph() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [activeNode, setActiveNode] = useState<NodeItem | null>(null);
	const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animationFrameId: number;
		let angleOffset = 0;

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;
			ctx.scale(dpr, dpr);
		};

		resize();
		window.addEventListener("resize", resize);

		// Number of fine radiating lines
		const RAY_COUNT = 96;
		// Ring points for outer constellation
		const RING_POINTS = 72;

		const render = () => {
			const rect = canvas.getBoundingClientRect();
			const width = rect.width;
			const height = rect.height;
			const cx = width / 2;
			const cy = height / 2;
			const maxRadius = Math.min(cx, cy) * 0.82;

			ctx.clearRect(0, 0, width, height);

			angleOffset += 0.0008;

			// Draw subtle concentric reference rings (brutalist technical guides)
			const ringRadii = [0.35, 0.6, 0.85, 1.0];
			ringRadii.forEach((factor, i) => {
				ctx.beginPath();
				ctx.arc(cx, cy, maxRadius * factor, 0, Math.PI * 2);
				ctx.strokeStyle = i === ringRadii.length - 1 ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.04)";
				ctx.lineWidth = 1;
				if (i === 1 || i === 2) {
					ctx.setLineDash([2, 6]);
				} else {
					ctx.setLineDash([]);
				}
				ctx.stroke();
				ctx.setLineDash([]);
			});

			// Draw fine radiating filaments from center (like Finzo graph)
			for (let i = 0; i < RAY_COUNT; i++) {
				const theta = (i / RAY_COUNT) * Math.PI * 2 + angleOffset * 0.4;
				const lengthVariation = 0.75 + 0.25 * Math.sin(i * 7 + angleOffset * 2);
				const rayRadius = maxRadius * lengthVariation;

				const startOffset = 20;
				const x0 = cx + Math.cos(theta) * startOffset;
				const y0 = cy + Math.sin(theta) * startOffset;
				const x1 = cx + Math.cos(theta) * rayRadius;
				const y1 = cy + Math.sin(theta) * rayRadius;

				const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
				gradient.addColorStop(0, "rgba(255, 255, 255, 0.35)");
				gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.08)");
				gradient.addColorStop(1, "rgba(255, 255, 255, 0.01)");

				ctx.beginPath();
				ctx.moveTo(x0, y0);
				ctx.lineTo(x1, y1);
				ctx.strokeStyle = gradient;
				ctx.lineWidth = 0.75;
				ctx.stroke();
			}

			// Draw dotted outer ring constellation
			for (let i = 0; i < RING_POINTS; i++) {
				const theta = (i / RING_POINTS) * Math.PI * 2 + angleOffset;
				const x = cx + Math.cos(theta) * maxRadius;
				const y = cy + Math.sin(theta) * maxRadius;

				ctx.beginPath();
				const isMajor = i % 6 === 0;
				ctx.arc(x, y, isMajor ? 2.5 : 1.2, 0, Math.PI * 2);
				ctx.fillStyle = isMajor ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.25)";
				ctx.fill();

				// Connecting fine chords
				if (i % 3 === 0) {
					const targetIndex = (i + 19) % RING_POINTS;
					const targetTheta = (targetIndex / RING_POINTS) * Math.PI * 2 + angleOffset;
					const tx = cx + Math.cos(targetTheta) * maxRadius;
					const ty = cy + Math.sin(targetTheta) * maxRadius;

					ctx.beginPath();
					ctx.moveTo(x, y);
					ctx.lineTo(tx, ty);
					ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
					ctx.lineWidth = 0.5;
					ctx.stroke();
				}
			}

			// Draw Central Core Node
			ctx.beginPath();
			ctx.arc(cx, cy, 6, 0, Math.PI * 2);
			ctx.fillStyle = "#ffffff";
			ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
			ctx.shadowBlur = 12;
			ctx.fill();
			ctx.shadowBlur = 0;

			// Core halo pulse
			const pulseRadius = 14 + Math.sin(Date.now() * 0.004) * 4;
			ctx.beginPath();
			ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
			ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
			ctx.lineWidth = 1;
			ctx.stroke();

			// Draw Major Architecture Nodes & Filaments
			NODES.forEach((node) => {
				const theta = node.angle + angleOffset * 0.5;
				const r = maxRadius * node.radiusFactor;
				const nx = cx + Math.cos(theta) * r;
				const ny = cy + Math.sin(theta) * r;

				const isHovered = activeNode?.id === node.id;

				// Connecting spine to center
				ctx.beginPath();
				ctx.moveTo(cx, cy);
				ctx.lineTo(nx, ny);
				ctx.strokeStyle = isHovered ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.15)";
				ctx.lineWidth = isHovered ? 1.5 : 0.75;
				ctx.stroke();

				// Node Point
				ctx.beginPath();
				ctx.arc(nx, ny, isHovered ? 5 : 3.5, 0, Math.PI * 2);
				ctx.fillStyle = isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.85)";
				if (isHovered) {
					ctx.shadowColor = "#ffffff";
					ctx.shadowBlur = 16;
				}
				ctx.fill();
				ctx.shadowBlur = 0;

				// Outer marker ring for node
				ctx.beginPath();
				ctx.arc(nx, ny, isHovered ? 10 : 7, 0, Math.PI * 2);
				ctx.strokeStyle = isHovered ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.3)";
				ctx.lineWidth = 1;
				ctx.stroke();

				// Node Label in Clean Monospace
				ctx.font = isHovered ? "bold 10px monospace" : "9px monospace";
				ctx.fillStyle = isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.65)";
				ctx.textAlign = nx > cx ? "left" : "right";
				ctx.textBaseline = "middle";

				const labelXOffset = nx > cx ? 16 : -16;
				ctx.fillText(node.label, nx + labelXOffset, ny);

				// Category small badge
				if (isHovered) {
					ctx.font = "8px monospace";
					ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
					ctx.fillText(`[${node.category} // ${node.status}]`, nx + labelXOffset, ny + 13);
				}
			});

			animationFrameId = requestAnimationFrame(render);
		};

		render();

		return () => {
			cancelAnimationFrame(animationFrameId);
			window.removeEventListener("resize", resize);
		};
	}, [activeNode]);

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		setMousePos({ x, y });

		const cx = rect.width / 2;
		const cy = rect.height / 2;
		const maxRadius = Math.min(cx, cy) * 0.82;

		// Check proximity to any node
		let foundNode: NodeItem | null = null;
		for (const node of NODES) {
			const r = maxRadius * node.radiusFactor;
			// Rough angle calculation ignoring minor animation offset
			const nx = cx + Math.cos(node.angle) * r;
			const ny = cy + Math.sin(node.angle) * r;
			const dist = Math.hypot(x - nx, y - ny);
			if (dist < 40) {
				foundNode = node;
				break;
			}
		}
		setActiveNode(foundNode);
	};

	const handleMouseLeave = () => {
		setActiveNode(null);
		setMousePos(null);
	};

	return (
		<div className="relative flex size-full min-h-[420px] items-center justify-center overflow-hidden">
			{/* Technical Coordinate Markers */}
			<div className="pointer-events-none absolute top-4 left-4 font-mono text-[10px] tracking-widest text-neutral-500 uppercase">
				RADIAL_ENGINE // GRAPH_V1
			</div>
			<div className="pointer-events-none absolute top-4 right-4 font-mono text-[10px] tracking-widest text-neutral-500 uppercase">
				FPS: 60 // RUST_WASM
			</div>
			<div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[10px] tracking-widest text-neutral-500 uppercase">
				SYS_TOPOLOGY: 8 NODES
			</div>
			<div className="pointer-events-none absolute right-4 bottom-4 font-mono text-[10px] tracking-widest text-neutral-500 uppercase">
				STATUS: OPERATIONAL
			</div>

			{/* Interactive Canvas */}
			<canvas
				ref={canvasRef}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				className="size-full cursor-crosshair"
				style={{ minHeight: "420px", minWidth: "360px" }}
			/>

			{/* Active Node Detail Card (Bottom Center Floating readout) */}
			{activeNode && (
				<div className="pointer-events-none absolute bottom-12 z-20 max-w-xs border border-neutral-700 bg-black/90 p-3 font-mono backdrop-blur-md">
					<div className="flex items-center justify-between border-b border-neutral-800 pb-1 text-[10px] text-neutral-400">
						<span>{activeNode.category}</span>
						<span className="text-emerald-400">{activeNode.status}</span>
					</div>
					<div className="mt-1.5 text-xs font-bold tracking-tight text-white">
						{activeNode.label}
					</div>
					<p className="mt-1 text-[11px] leading-relaxed text-neutral-300">
						{activeNode.description}
					</p>
				</div>
			)}
		</div>
	);
}
