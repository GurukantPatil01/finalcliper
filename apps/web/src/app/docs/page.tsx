import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	SparklesIcon,
	CodeIcon,
	CloudIcon,
	Analytics01Icon,
	PlayIcon,
	Shield01Icon,
	ArrowRight01Icon,
	CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

export const metadata: Metadata = {
	title: "Documentation — Finalcliper Setup & Architecture Guide",
	description:
		"Complete setup guide to run Finalcliper locally and deploy online to Vercel, Cloud Run, or Docker, with Google ADK2 AI Agents and Analytics configuration.",
};

export default function DocsPage() {
	return (
		<div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black">
			<Header />

			<div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
				{/* Docs Hero Banner */}
				<div className="mb-12 border-b border-neutral-800 pb-8">
					<div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
						<HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
						Full Documentation & Setup Guide
					</div>
					<h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl uppercase">
						Finalcliper Docs
					</h1>
					<p className="mt-4 text-base text-neutral-400 max-w-3xl leading-relaxed">
						Learn how to run Finalcliper locally, configure Google ADK2 AI agents, connect YouTube Studio & Instagram Analytics, and deploy securely online.
					</p>
				</div>

				{/* Quick Navigation Cards */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-16">
					<a
						href="#local-setup"
						className="group rounded-xl border border-neutral-800 bg-neutral-950 p-5 transition-all hover:border-primary hover:bg-neutral-900/50"
					>
						<div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-black transition-colors">
							<HugeiconsIcon icon={CodeIcon} className="size-5" />
						</div>
						<h3 className="font-bold text-sm text-white flex items-center justify-between">
							Local Setup
							<HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-neutral-500 group-hover:text-primary transition-colors" />
						</h3>
						<p className="mt-1.5 text-xs text-neutral-400 leading-relaxed">
							Run the app on localhost with Bun and Node in under 2 minutes.
						</p>
					</a>

					<a
						href="#online-deployment"
						className="group rounded-xl border border-neutral-800 bg-neutral-950 p-5 transition-all hover:border-primary hover:bg-neutral-900/50"
					>
						<div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
							<HugeiconsIcon icon={CloudIcon} className="size-5" />
						</div>
						<h3 className="font-bold text-sm text-white flex items-center justify-between">
							Deploy Online
							<HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
						</h3>
						<p className="mt-1.5 text-xs text-neutral-400 leading-relaxed">
							Production deployment on Vercel, Google Cloud Run, or Docker.
						</p>
					</a>

					<a
						href="#ai-agents"
						className="group rounded-xl border border-neutral-800 bg-neutral-950 p-5 transition-all hover:border-primary hover:bg-neutral-900/50"
					>
						<div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-colors">
							<HugeiconsIcon icon={SparklesIcon} className="size-5" />
						</div>
						<h3 className="font-bold text-sm text-white flex items-center justify-between">
							AI Agents & Copilot
							<HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-neutral-500 group-hover:text-amber-400 transition-colors" />
						</h3>
						<p className="mt-1.5 text-xs text-neutral-400 leading-relaxed">
							Google ADK2 Analysis Agent, Booming Radar, and timeline cuts.
						</p>
					</a>

					<a
						href="#analytics-setup"
						className="group rounded-xl border border-neutral-800 bg-neutral-950 p-5 transition-all hover:border-primary hover:bg-neutral-900/50"
					>
						<div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-black transition-colors">
							<HugeiconsIcon icon={Analytics01Icon} className="size-5" />
						</div>
						<h3 className="font-bold text-sm text-white flex items-center justify-between">
							Analytics APIs
							<HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-neutral-500 group-hover:text-blue-400 transition-colors" />
						</h3>
						<p className="mt-1.5 text-xs text-neutral-400 leading-relaxed">
							Google Cloud & Meta App OAuth setup with 1-click token handoff.
						</p>
					</a>
				</div>

				{/* Content Sections */}
				<div className="space-y-16">
					{/* SECTION 1: Local Setup */}
					<section id="local-setup" className="scroll-mt-24 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 md:p-8">
						<div className="flex items-center gap-3 mb-6">
							<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
								1
							</div>
							<h2 className="text-2xl font-bold text-white uppercase tracking-wide">
								How to Run Locally
							</h2>
						</div>

						<div className="space-y-6 text-sm text-neutral-300 leading-relaxed">
							<div>
								<h3 className="text-base font-semibold text-white mb-2">Prerequisites</h3>
								<ul className="list-disc pl-5 space-y-1 text-neutral-400">
									<li><strong className="text-neutral-200">Bun:</strong> Version <code className="text-primary bg-neutral-900 px-1.5 py-0.5 rounded">1.2.x</code> or newer (<a href="https://bun.sh" target="_blank" rel="noreferrer" className="underline text-primary">install Bun</a>).</li>
									<li><strong className="text-neutral-200">Node.js:</strong> Version 18+ (used by Turborepo & Next.js).</li>
									<li><strong className="text-neutral-200">Gemini API Key:</strong> Free from <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="underline text-primary">Google AI Studio</a>.</li>
								</ul>
							</div>

							<div>
								<h3 className="text-base font-semibold text-white mb-2">Step 1: Clone Repository & Install Dependencies</h3>
								<div className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 font-mono text-xs text-neutral-200 overflow-x-auto">
									<p className="text-neutral-500"># 1. Clone the repository</p>
									<p>git clone https://github.com/your-username/kneecap.git</p>
									<p>cd kneecap</p>
									<br />
									<p className="text-neutral-500"># 2. Install all workspace dependencies via Bun</p>
									<p>bun install</p>
								</div>
							</div>

							<div>
								<h3 className="text-base font-semibold text-white mb-2">Step 2: Configure Environment Variables</h3>
								<p className="text-neutral-400 mb-2">
									Create a <code className="text-primary bg-neutral-900 px-1.5 py-0.5 rounded">.env.local</code> file in <code className="text-neutral-300">apps/web/</code>:
								</p>
								<div className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 font-mono text-xs text-neutral-200 overflow-x-auto">
									<p className="text-neutral-500"># Base App Configuration</p>
									<p>NEXT_PUBLIC_APP_URL=http://localhost:3000</p>
									<p>NODE_ENV=development</p>
									<br />
									<p className="text-neutral-500"># Google Gemini AI Key (for AI Copilot, Video Scripting, & ADK2 Agents)</p>
									<p>GEMINI_API_KEY=AIzaSy...</p>
									<br />
									<p className="text-neutral-500"># Optional: YouTube Studio OAuth credentials (Google Cloud Console)</p>
									<p>YOUTUBE_CLIENT_ID=340978777180-xxx.apps.googleusercontent.com</p>
									<p>YOUTUBE_CLIENT_SECRET=GOCSPX-xxx</p>
									<br />
									<p className="text-neutral-500"># Optional: Instagram Graph API OAuth credentials (Meta Developer Portal)</p>
									<p>INSTAGRAM_CLIENT_ID=your_meta_app_id</p>
									<p>INSTAGRAM_CLIENT_SECRET=your_meta_app_secret</p>
								</div>
							</div>

							<div>
								<h3 className="text-base font-semibold text-white mb-2">Step 3: Launch Local Development Server</h3>
								<div className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 font-mono text-xs text-neutral-200 overflow-x-auto">
									<p className="text-neutral-500"># Start local Next.js Turbopack development server</p>
									<p>bun dev</p>
									<br />
									<p className="text-neutral-500"># Or run only the web workspace directly</p>
									<p>bun run dev:web</p>
								</div>
								<p className="mt-2 text-xs text-neutral-400">
									Open <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="text-primary underline">http://localhost:3000</a> in your browser. The app runs local-first with zero database requirements!
								</p>
							</div>

							<div>
								<h3 className="text-base font-semibold text-white mb-2">Step 4: Run Tests & Type Checks</h3>
								<div className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 font-mono text-xs text-neutral-200 overflow-x-auto">
									<p className="text-neutral-500"># Run full test suite (68 tests across agents, timeline, and analytics)</p>
									<p>cd apps/web && bun test</p>
									<br />
									<p className="text-neutral-500"># Validate TypeScript types</p>
									<p>bun x tsc --noEmit</p>
								</div>
							</div>
						</div>
					</section>

					{/* SECTION 2: Online Deployment */}
					<section id="online-deployment" className="scroll-mt-24 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 md:p-8">
						<div className="flex items-center gap-3 mb-6">
							<div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-sm">
								2
							</div>
							<h2 className="text-2xl font-bold text-white uppercase tracking-wide">
								How to Deploy Online
							</h2>
						</div>

						<div className="space-y-6 text-sm text-neutral-300 leading-relaxed">
							<div>
								<h3 className="text-base font-semibold text-white mb-2">Option A: Deploy to Vercel (Recommended)</h3>
								<ol className="list-decimal pl-5 space-y-2 text-neutral-400">
									<li>Push your code to GitHub.</li>
									<li>Import the repository into <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Vercel</a>.</li>
									<li>Set the <strong>Root Directory</strong> to <code className="text-neutral-200">apps/web</code>.</li>
									<li>Add your Environment Variables (<code className="text-neutral-200">GEMINI_API_KEY</code>, <code className="text-neutral-200">NEXT_PUBLIC_APP_URL=https://yourdomain.com</code>, and OAuth credentials).</li>
									<li>Click <strong>Deploy</strong>. Vercel automatically builds and serves the Next.js app on edge serverless infrastructure.</li>
								</ol>
							</div>

							<div>
								<h3 className="text-base font-semibold text-white mb-2">Option B: Deploy to Google Cloud Run / Docker</h3>
								<div className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 font-mono text-xs text-neutral-200 overflow-x-auto">
									<p className="text-neutral-500"># Build production container</p>
									<p>docker build -t finalcliper-web -f apps/web/Dockerfile .</p>
									<br />
									<p className="text-neutral-500"># Run container on port 3000</p>
									<p>docker run -p 3000:3000 -e GEMINI_API_KEY="your_key" -e NEXT_PUBLIC_APP_URL="https://yourdomain.com" finalcliper-web</p>
								</div>
							</div>

							<div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
								<h4 className="font-semibold text-amber-400 flex items-center gap-2 text-sm">
									<HugeiconsIcon icon={Shield01Icon} className="size-4" />
									Production OAuth Redirect URI Checklist
								</h4>
								<p className="mt-1 text-xs text-neutral-300">
									When deploying on your live domain (e.g. <code className="text-white">https://app.finalcliper.com</code>), make sure to add the exact callback URLs to your Google Cloud Console and Meta Developer App:
								</p>
								<ul className="mt-2 space-y-1 text-xs font-mono text-amber-300/90 pl-4 list-disc">
									<li>https://yourdomain.com/api/youtube/oauth/callback</li>
									<li>https://yourdomain.com/api/instagram/oauth/callback</li>
								</ul>
							</div>
						</div>
					</section>

					{/* SECTION 3: AI Agents & Video Copilot */}
					<section id="ai-agents" className="scroll-mt-24 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 md:p-8">
						<div className="flex items-center gap-3 mb-6">
							<div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-bold text-sm">
								3
							</div>
							<h2 className="text-2xl font-bold text-white uppercase tracking-wide">
								Google ADK2 AI Agents & Copilot Features
							</h2>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2">
								<h3 className="font-bold text-white text-sm flex items-center gap-2">
									<HugeiconsIcon icon={SparklesIcon} className="size-4 text-primary" />
									ADK2 Analysis Agent
								</h3>
								<p className="text-xs text-neutral-400 leading-relaxed">
									Deeply analyzes historical performance metrics from YouTube Studio and Instagram Reels to diagnose retention drop-offs and formulate ready-to-produce video blueprints.
								</p>
								<div className="text-[11px] font-mono text-primary">Command: "analyze" or "auto create"</div>
							</div>

							<div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2">
								<h3 className="font-bold text-white text-sm flex items-center gap-2">
									<HugeiconsIcon icon={PlayIcon} className="size-4 text-emerald-400" />
									Live Booming Creator Radar
								</h3>
								<p className="text-xs text-neutral-400 leading-relaxed">
									Scans the live 2026 creator ecosystem using Google search grounding to find the fastest-growing viral formats, retention hooks, and pacing styles right now.
								</p>
								<div className="text-[11px] font-mono text-emerald-400">Command: "booming" or "trending now"</div>
							</div>

							<div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2">
								<h3 className="font-bold text-white text-sm flex items-center gap-2">
									<HugeiconsIcon icon={CodeIcon} className="size-4 text-blue-400" />
									Natural Language Video Cutting
								</h3>
								<p className="text-xs text-neutral-400 leading-relaxed">
									Instant 0ms latency timeline control. Execute cuts at playhead, split left/right, jump to timestamp, or create rhythm pacing cuts every 3 seconds.
								</p>
								<div className="text-[11px] font-mono text-blue-400">Commands: "cut here", "cut every 3s", "split at 5s"</div>
							</div>

							<div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2">
								<h3 className="font-bold text-white text-sm flex items-center gap-2">
									<HugeiconsIcon icon={Analytics01Icon} className="size-4 text-purple-400" />
									Veo Video & TTS Narration
								</h3>
								<p className="text-xs text-neutral-400 leading-relaxed">
									Generates cinematic Veo video shots and neural text-to-speech voiceovers automatically imported into your multi-track timeline as complete editable elements.
								</p>
								<div className="text-[11px] font-mono text-purple-400">Command: "write a script on [topic]"</div>
							</div>
						</div>
					</section>

					{/* SECTION 4: Analytics Setup & APIs */}
					<section id="analytics-setup" className="scroll-mt-24 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 md:p-8">
						<div className="flex items-center gap-3 mb-6">
							<div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 font-bold text-sm">
								4
							</div>
							<h2 className="text-2xl font-bold text-white uppercase tracking-wide">
								YouTube & Instagram Analytics API Configuration
							</h2>
						</div>

						<div className="space-y-6 text-sm text-neutral-300 leading-relaxed">
							<div>
								<h3 className="text-base font-semibold text-white mb-2">1. Enabling YouTube Data API v3</h3>
								<ol className="list-decimal pl-5 space-y-1.5 text-neutral-400">
									<li>Go to the <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">Google Cloud Console API Library</a>.</li>
									<li>Select your project (or create one) and click <strong>Enable</strong> for <strong>YouTube Data API v3</strong>.</li>
									<li>Under <strong>Credentials</strong>, create an <strong>OAuth 2.0 Client ID</strong> (Web application) with Authorized Redirect URI: <code className="text-neutral-200">http://localhost:3000/api/youtube/oauth/callback</code>.</li>
								</ol>
							</div>

							<div>
								<h3 className="text-base font-semibold text-white mb-2">2. Instagram Graph API Setup</h3>
								<ol className="list-decimal pl-5 space-y-1.5 text-neutral-400">
									<li>Create an app on the <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">Meta for Developers Portal</a> with <strong>Instagram Graph API</strong> permissions.</li>
									<li>In development mode, add your Instagram user under <strong>Roles → Instagram Testers</strong> and accept the invitation in Instagram Settings.</li>
									<li>Add Authorized Redirect URI: <code className="text-neutral-200">http://localhost:3000/api/instagram/oauth/callback</code>.</li>
								</ol>
							</div>

							<div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
								<h4 className="font-semibold text-white text-sm mb-1">💡 Manual Token Fallback (Zero-OAuth Setup)</h4>
								<p className="text-xs text-neutral-400">
									If you prefer not to configure full OAuth apps, you can directly paste your Google Access Token or Instagram Graph Token in <Link href="/analytics/settings" className="text-primary underline">/analytics/settings</Link> and <Link href="/analytics/youtube/settings" className="text-primary underline">/analytics/youtube/settings</Link> for instant sync.
								</p>
							</div>
						</div>
					</section>
				</div>

				{/* Bottom CTA */}
				<div className="mt-16 text-center border-t border-neutral-800 pt-10">
					<h3 className="text-xl font-bold text-white uppercase">Ready to start creating?</h3>
					<p className="mt-2 text-sm text-neutral-400">Launch the video editor or jump into your analytics dashboard.</p>
					<div className="mt-6 flex flex-wrap justify-center gap-4">
						<Button asChild size="lg" className="bg-primary text-black font-bold hover:bg-primary/90">
							<Link href="/projects">
								Launch Editor
								<HugeiconsIcon icon={ArrowRight01Icon} className="size-4 ml-1" />
							</Link>
						</Button>
						<Button asChild variant="outline" size="lg" className="border-neutral-700 text-white hover:bg-neutral-900">
							<Link href="/analytics">
								View Analytics
							</Link>
						</Button>
					</div>
				</div>
			</div>

			<Footer />
		</div>
	);
}
