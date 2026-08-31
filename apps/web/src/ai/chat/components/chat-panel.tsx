"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	SparklesIcon,
	ArrowUp01Icon,
	Cancel01Icon,
	Loading03Icon,
	Copy01Icon,
	Upload03Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/ui";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { AddMediaAssetCommand } from "@/commands/media";
import { InsertElementCommand } from "@/commands/timeline";
import { BatchCommand } from "@/commands";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/timeline/creation";
import { mediaTimeFromSeconds, mediaTimeToSeconds } from "@/wasm";
import type { EditorCore } from "@/core";
import type { MediaAsset } from "@/media/types";
import type { TrendReport, VideoScript, Scene, AnalysisReport, ProductionDirective } from "@/ai/agents/types";
import type { BoomingCreatorMeta } from "@/app/api/ai/booming/route";
import { getUserApiKey } from "@/services/api-keys/storage";
import { ApiKeysButton } from "@/components/settings/api-keys-modal";
import { listSnapshots, listYouTubeSnapshots } from "@/services/analytics/db";
import { buildDataPack } from "@/analytics/data-pack";
import { buildYouTubeDataPack } from "@/analytics/youtube-data-pack";

import { matchLocalEditorCommand, executeCopilotAction } from "../editor-copilot";

type Editor = EditorCore;
type ProcessedAsset = Omit<MediaAsset, "id">;

type ChatMessage =
	| { id: number; role: "user"; text: string }
	| { id: number; role: "assistant"; text: string }
	| { id: number; role: "action"; summary: string; actionType?: string }
	| { id: number; role: "error"; text: string }
	| { id: number; role: "booming"; metas: BoomingCreatorMeta[] }
	| { id: number; role: "analysis"; report: AnalysisReport }
	| { id: number; role: "trend"; report: TrendReport }
	| { id: number; role: "script"; script: VideoScript }
	| { id: number; role: "clip"; sceneIndex: number; hasAudio: boolean }
	| {
			id: number;
			role: "clip-error";
			text: string;
			isQuota: boolean;
			retry: { script: VideoScript; scene: Scene };
	  };

const QUICK_ACTIONS = [
	{ label: "🔥 What's Booming Now", cmd: "booming" },
	{ label: "📊 Auto-Produce from Analytics", cmd: "analyze" },
	{ label: "✂️ Cut here", cmd: "cut" },
	{ label: "✂️ Split left", cmd: "split left" },
	{ label: "✂️ Split right", cmd: "split right" },
	{ label: "⚡ Cut every 3s", cmd: "cut every 3s" },
	{ label: "▶️ Play/Pause", cmd: "toggle play" },
];

const SUGGESTIONS = [
	"🔥 Discover what's booming across top creators right now",
	"📊 Auto-produce video from channel analytics",
	"✂️ Cut video at current playhead",
	"⚡ Cut every 3 seconds for fast pacing",
	"💡 Write a viral script about AI productivity tools",
];

/**
 * Build the (add-asset + insert-element) command pair for one processed asset,
 * placed at `startTime` on the given track type. Mirrors use-paste-media.ts.
 */
function assetCommands({
	projectId,
	asset,
	startTime,
	trackType,
	fallbackDurationSeconds,
}: {
	projectId: string;
	asset: ProcessedAsset;
	startTime: ReturnType<typeof mediaTimeFromSeconds>;
	trackType: "video" | "audio";
	fallbackDurationSeconds?: number;
}): [AddMediaAssetCommand, InsertElementCommand] {
	const addCmd = new AddMediaAssetCommand({ projectId, asset });
	const mediaId = addCmd.getAssetId();
	const duration =
		asset.duration != null
			? mediaTimeFromSeconds({ seconds: asset.duration })
			: fallbackDurationSeconds != null
				? mediaTimeFromSeconds({ seconds: fallbackDurationSeconds })
				: DEFAULT_NEW_ELEMENT_DURATION;
	const element = buildElementFromMedia({
		mediaId,
		mediaType: asset.type,
		name: asset.name,
		duration,
		startTime,
		buffer:
			asset.type === "audio"
				? new AudioBuffer({ length: 1, sampleRate: 44100 })
				: undefined,
	});
	const insertCmd = new InsertElementCommand({
		element,
		placement: { mode: "auto", trackType },
	});
	return [addCmd, insertCmd];
}

/**
 * Drop a scene's visual (a generated Veo MP4 or a still/clip imported from AI
 * Studio) plus an optional voiceover onto the timeline as one undoable unit,
 * all starting at the current playhead. Images and videos share the visual
 * ("video") track; a still with no intrinsic duration uses the scene length.
 */
async function injectClip({
	editor,
	visualFile,
	audio,
	baseName,
	fallbackDurationSeconds,
}: {
	editor: Editor;
	visualFile: File;
	audio: Blob | null;
	baseName: string;
	fallbackDurationSeconds?: number;
}): Promise<void> {
	const project = editor.project.getActiveOrNull();
	if (!project) {
		throw new Error("No active project to add the clip to.");
	}
	const projectId = project.metadata.id;
	const startTime = editor.playback.getCurrentTime();

	const [visualAsset] = await processMediaAssets({ files: [visualFile] });
	if (!visualAsset) {
		throw new Error("Could not process the scene visual.");
	}
	if (visualAsset.type === "audio") {
		throw new Error(
			"That file is audio-only — import a video or image for the visual.",
		);
	}
	const commands = [
		...assetCommands({
			projectId,
			asset: visualAsset,
			startTime,
			trackType: "video",
			fallbackDurationSeconds,
		}),
	];

	if (audio) {
		const audioFile = new File([audio], `${baseName}-vo.wav`, {
			type: "audio/wav",
		});
		const [audioAsset] = await processMediaAssets({ files: [audioFile] });
		if (audioAsset) {
			commands.push(
				...assetCommands({
					projectId,
					asset: audioAsset,
					startTime,
					trackType: "audio",
				}),
			);
		}
	}

	editor.command.execute({ command: new BatchCommand(commands) });
}

function getAiHeaders(extra?: Record<string, string>): Record<string, string> {
	const geminiKey = getUserApiKey("geminiApiKey");
	return {
		"Content-Type": "application/json",
		...(geminiKey ? { "x-gemini-api-key": geminiKey } : {}),
		...extra,
	};
}

/**
 * Fetch a scene's voiceover from the free TTS route. Returns null on any
 * failure — a missing voiceover shouldn't block a scene's visual.
 */
async function fetchVoiceoverBlob({
	line,
	voiceDirection,
}: {
	line: string;
	voiceDirection?: string;
}): Promise<Blob | null> {
	try {
		const res = await fetch("/api/ai/tts", {
			method: "POST",
			headers: getAiHeaders(),
			body: JSON.stringify({ text: line, voiceDirection }),
		});
		return res.ok ? await res.blob() : null;
	} catch {
		return null;
	}
}

export function ChatPanel({ onClose }: { onClose?: () => void }) {
	const editor = useEditor();
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [busy, setBusy] = useState(false);
	const [pendingLabel, setPendingLabel] = useState<string>("");
	const idRef = useRef(0);
	const scrollRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const pendingImportRef = useRef<{ script: VideoScript; scene: Scene } | null>(
		null,
	);

	const nextId = () => ++idRef.current;

	const scrollToBottom = () => {
		requestAnimationFrame(() => {
			const el = scrollRef.current;
			if (el) el.scrollTop = el.scrollHeight;
		});
	};

	const pushMessage = (message: ChatMessage) => {
		setMessages((prev) => [...prev, message]);
		scrollToBottom();
	};

	/** Niche → trend brief → script. The cheap, fast text stages, auto-chained. */
	const runScriptPipeline = async (
		rawNiche: string,
		directive?: ProductionDirective,
	) => {
		const niche = rawNiche.trim();
		if (!niche || busy) return;

		setBusy(true);

		try {
			setPendingLabel(
				directive
					? `Aligning viral angles for "${directive.title}"…`
					: `Analyzing viral trends in “${niche}”…`,
			);
			const trendRes = await fetch("/api/ai/trend", {
				method: "POST",
				headers: getAiHeaders(),
				body: JSON.stringify({ niche, directive }),
			});
			const trendData = await trendRes.json().catch(() => null);
			if (!trendRes.ok) {
				pushMessage({
					id: nextId(),
					role: "error",
					text: errorText({ status: trendRes.status, data: trendData }),
				});
				return;
			}
			const report: TrendReport = trendData.report;
			pushMessage({ id: nextId(), role: "trend", report });

			setPendingLabel("Writing the script…");
			const scriptRes = await fetch("/api/ai/script", {
				method: "POST",
				headers: getAiHeaders(),
				body: JSON.stringify({ report }),
			});
			const scriptData = await scriptRes.json().catch(() => null);
			if (!scriptRes.ok) {
				pushMessage({
					id: nextId(),
					role: "error",
					text: errorText({ status: scriptRes.status, data: scriptData }),
				});
				return;
			}
			pushMessage({ id: nextId(), role: "script", script: scriptData.script });
		} catch {
			pushMessage({
				id: nextId(),
				role: "error",
				text: "Couldn't reach the server. Check your connection and try again.",
			});
		} finally {
			setBusy(false);
			setPendingLabel("");
			scrollToBottom();
		}
	};

	/** Autonomous Analysis Agent: Analyzes historical metrics and auto-creates video */
	const runAnalysisPipeline = async () => {
		if (busy) return;
		setBusy(true);
		setPendingLabel("Ingesting channel metrics across platforms…");

		try {
			const [igSnapshots, ytSnapshots] = await Promise.all([
				listSnapshots().catch(() => []),
				listYouTubeSnapshots().catch(() => []),
			]);

			if (igSnapshots.length === 0 && ytSnapshots.length === 0) {
				pushMessage({
					id: nextId(),
					role: "assistant",
					text: "No channel analytics data found yet. Connect your YouTube or Instagram account in `/analytics` first, or sync metrics to get autonomous AI production recommendations.",
				});
				setBusy(false);
				return;
			}

			let instagramData;
			let youtubeData;

			if (igSnapshots.length > 0) {
				try {
					instagramData = buildDataPack(igSnapshots);
				} catch (e) {
					console.warn("Could not build IG data pack:", e);
				}
			}

			if (ytSnapshots.length > 0) {
				try {
					youtubeData = buildYouTubeDataPack(ytSnapshots);
				} catch (e) {
					console.warn("Could not build YouTube data pack:", e);
				}
			}

			if (!instagramData && !youtubeData) {
				pushMessage({
					id: nextId(),
					role: "assistant",
					text: "Please perform a sync on your YouTube or Instagram analytics dashboard to gather at least one snapshot for the Analysis Agent.",
				});
				setBusy(false);
				return;
			}

			setPendingLabel("Google ADK2 Analysis Agent diagnosing audience retention…");

			const res = await fetch("/api/ai/analyze", {
				method: "POST",
				headers: getAiHeaders(),
				body: JSON.stringify({ instagramData, youtubeData }),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				pushMessage({
					id: nextId(),
					role: "error",
					text: errorText({ status: res.status, data }),
				});
				return;
			}

			const { report }: { report: AnalysisReport } = await res.json();
			pushMessage({ id: nextId(), role: "analysis", report });

			// Automatically produce the next video based on the blueprint!
			toast.success("Analysis complete! Auto-producing tailored video script...");
			await runScriptPipeline(
				report.nextVideoBlueprint.concept,
				report.nextVideoBlueprint,
			);
		} catch (error) {
			console.error("Analysis pipeline error:", error);
			pushMessage({
				id: nextId(),
				role: "error",
				text: "Analysis agent failed to evaluate metrics. Please check your API key and connection.",
			});
		} finally {
			setBusy(false);
			setPendingLabel("");
			scrollToBottom();
		}
	};

	/** Real-time Booming Creator Radar */
	const fetchBoomingRadar = async () => {
		if (busy) return;
		setBusy(true);
		setPendingLabel("Scanning real-time creator ecosystem for booming formats…");

		try {
			const res = await fetch("/api/ai/booming", {
				method: "GET",
				headers: getAiHeaders(),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				pushMessage({
					id: nextId(),
					role: "error",
					text: errorText({ status: res.status, data }),
				});
				return;
			}
			const data: { trendingMetas: BoomingCreatorMeta[] } = await res.json();
			pushMessage({
				id: nextId(),
				role: "booming",
				metas: data.trendingMetas,
			});
		} catch (error) {
			console.error("Booming radar fetch failed:", error);
			pushMessage({
				id: nextId(),
				role: "error",
				text: "Couldn't reach the viral radar. Please check your connection and API key.",
			});
		} finally {
			setBusy(false);
			setPendingLabel("");
			scrollToBottom();
		}
	};

	/** Main unified message handler: routes between timeline commands and AI generation */
	const handleSendMessage = async (rawPrompt: string) => {
		const prompt = rawPrompt.trim();
		if (!prompt || busy) return;

		setInput("");
		pushMessage({ id: nextId(), role: "user", text: prompt });

		// 1. Check local fast-path editor commands (0ms instant execution)
		const localAction = matchLocalEditorCommand(prompt);
		if (localAction) {
			if (localAction.type === "booming_radar") {
				void fetchBoomingRadar();
				return;
			}
			if (localAction.type === "analyze_and_produce") {
				void runAnalysisPipeline();
				return;
			}
			if (localAction.type === "generate_script") {
				void runScriptPipeline(localAction.topic);
				return;
			}
			const result = executeCopilotAction(localAction, editor);
			if (result.success) {
				pushMessage({
					id: nextId(),
					role: "action",
					summary: result.summary,
					actionType: result.actionType,
				});
				toast.success(result.summary);
			} else {
				pushMessage({
					id: nextId(),
					role: "error",
					text: result.summary,
				});
			}
			return;
		}

		// 2. Otherwise consult the AI Copilot backend
		setBusy(true);
		setPendingLabel("Thinking…");

		try {
			const scene = editor.scenes.getActiveSceneOrNull();
			const durationSeconds = mediaTimeToSeconds({ time: editor.timeline.getTotalDuration() });
			const currentTimeSeconds = mediaTimeToSeconds({ time: editor.playback.getCurrentTime() });
			let elementCount = 0;
			if (scene && Array.isArray(scene.tracks)) {
				for (const track of scene.tracks) {
					elementCount += track.elements?.length ?? 0;
				}
			}
			const selectedCount = editor.selection.getSelectedElements().length;

			const chatRes = await fetch("/api/ai/chat", {
				method: "POST",
				headers: getAiHeaders(),
				body: JSON.stringify({
					prompt,
					timelineContext: {
						durationSeconds,
						currentTimeSeconds,
						elementCount,
						selectedCount,
					},
				}),
			});

			if (chatRes.ok) {
				const data = await chatRes.json();
				if (data.action) {
					if (data.action.type === "booming_radar") {
						void fetchBoomingRadar();
						return;
					}
					if (data.action.type === "analyze_and_produce") {
						void runAnalysisPipeline();
						return;
					}
					if (data.action.type === "generate_script") {
						void runScriptPipeline(data.action.topic || prompt);
						return;
					}
					const result = executeCopilotAction(data.action, editor);
					if (result.success) {
						pushMessage({
							id: nextId(),
							role: "action",
							summary: result.summary,
							actionType: result.actionType,
						});
					}
				}
				if (data.message) {
					pushMessage({
						id: nextId(),
						role: "assistant",
						text: data.message,
					});
				}
			} else {
				// Fallback if /api/ai/chat has no keys:
				// If prompt looks like a topic, run script generation
				const isTopic =
					prompt.length < 50 &&
					!prompt.toLowerCase().includes("cut") &&
					!prompt.toLowerCase().includes("how");

				if (isTopic) {
					void runScriptPipeline(prompt);
					return;
				}

				pushMessage({
					id: nextId(),
					role: "assistant",
					text: `I'm your video editing copilot. You can tell me to cut clips (**"cut here"**, **"split at 5s"**, **"cut every 3s"**), control playback (**"play"**, **"pause"**), or create viral scripts (**"write a script about crypto"**).`,
				});
			}
		} catch (err) {
			console.error("Copilot error:", err);
			pushMessage({
				id: nextId(),
				role: "assistant",
				text: `Ready to assist with video edits. Try commands like **"cut"**, **"split left"**, **"cut every 3s"**, or **"write a script on travel"**.`,
			});
		} finally {
			setBusy(false);
			setPendingLabel("");
			scrollToBottom();
		}
	};

	/** Generate one scene: Veo clip + TTS voiceover → onto the timeline. */
	const generateClip = async ({
		script,
		scene,
	}: {
		script: VideoScript;
		scene: Scene;
	}) => {
		if (busy) return;
		setBusy(true);
		try {
			setPendingLabel(
				`Generating the visual for scene ${scene.index}… (this takes a minute or two)`,
			);
			const videoRes = await fetch("/api/ai/video", {
				method: "POST",
				headers: getAiHeaders(),
				body: JSON.stringify({
					visualPrompt: scene.visualPrompt,
					aspectRatio: script.aspectRatio,
				}),
			});
			if (!videoRes.ok) {
				const data = await videoRes.json().catch(() => null);
				pushMessage({
					id: nextId(),
					role: "clip-error",
					text: errorText({ status: videoRes.status, data }),
					isQuota: videoRes.status === 429,
					retry: { script, scene },
				});
				return;
			}
			const visualBlob = await videoRes.blob();
			const contentType = (
				videoRes.headers.get("Content-Type") ||
				visualBlob.type ||
				"video/mp4"
			).toLowerCase();
			const isImage = contentType.startsWith("image/");
			const subtype =
				contentType.split(";")[0].split("/")[1] || (isImage ? "png" : "mp4");
			const ext = subtype === "jpeg" ? "jpg" : subtype;
			const visualType =
				isImage || contentType.startsWith("video/")
					? contentType
					: "video/mp4";

			let audioBlob: Blob | null = null;
			const line = scene.voiceover?.trim();
			if (line) {
				setPendingLabel(`Voicing the narration for scene ${scene.index}…`);
				audioBlob = await fetchVoiceoverBlob({
					line,
					voiceDirection: script.voiceDirection,
				});
			}

			setPendingLabel("Adding the clip to your timeline…");
			await injectClip({
				editor,
				visualFile: new File([visualBlob], `ai-scene-${scene.index}.${ext}`, {
					type: visualType,
				}),
				audio: audioBlob,
				baseName: `ai-scene-${scene.index}`,
				fallbackDurationSeconds: scene.durationSeconds,
			});
			pushMessage({
				id: nextId(),
				role: "clip",
				sceneIndex: scene.index,
				hasAudio: audioBlob != null,
			});
		} catch (error) {
			pushMessage({
				id: nextId(),
				role: "clip-error",
				text:
					error instanceof Error
						? error.message
						: "Something went wrong adding the clip.",
				isQuota: false,
				retry: { script, scene },
			});
		} finally {
			setBusy(false);
			setPendingLabel("");
			scrollToBottom();
		}
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void handleSendMessage(input);
		}
	};

	/** Copy a scene's visual prompt to paste into Google AI Studio (free web UI). */
	const copyPrompt = async (scene: Scene) => {
		try {
			await navigator.clipboard.writeText(scene.visualPrompt);
			toast.success(
				`Scene ${scene.index} prompt copied — paste it into AI Studio.`,
			);
		} catch {
			toast.error("Couldn't copy the prompt to your clipboard.");
		}
	};

	/** Open the file picker to import the visual you made for this scene. */
	const requestImport = ({
		script,
		scene,
	}: {
		script: VideoScript;
		scene: Scene;
	}) => {
		if (busy) return;
		pendingImportRef.current = { script, scene };
		fileInputRef.current?.click();
	};

	/** Place a hand-imported visual (+ free voiceover) onto that scene's slot. */
	const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		const pending = pendingImportRef.current;
		pendingImportRef.current = null;
		if (!file || !pending || busy) return;

		const { script, scene } = pending;
		setBusy(true);
		try {
			let audioBlob: Blob | null = null;
			const line = scene.voiceover?.trim();
			if (line) {
				setPendingLabel(`Voicing the narration for scene ${scene.index}…`);
				audioBlob = await fetchVoiceoverBlob({
					line,
					voiceDirection: script.voiceDirection,
				});
			}

			setPendingLabel("Adding your imported visual to the timeline…");
			await injectClip({
				editor,
				visualFile: file,
				audio: audioBlob,
				baseName: `ai-scene-${scene.index}`,
				fallbackDurationSeconds: scene.durationSeconds,
			});
			pushMessage({
				id: nextId(),
				role: "clip",
				sceneIndex: scene.index,
				hasAudio: audioBlob != null,
			});
		} catch (error) {
			pushMessage({
				id: nextId(),
				role: "error",
				text:
					error instanceof Error
						? error.message
						: "Couldn't import that file onto the timeline.",
			});
		} finally {
			setBusy(false);
			setPendingLabel("");
			scrollToBottom();
		}
	};

	return (
		<div className="bg-background flex h-full min-h-0 w-full flex-col rounded-lg border">
			<input
				ref={fileInputRef}
				type="file"
				accept="video/*,image/*"
				className="hidden"
				onChange={(e) => void onFileSelected(e)}
			/>
			{/* Header */}
			<div className="flex items-center gap-2 border-b px-3 py-2.5">
				<div className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
					<HugeiconsIcon icon={SparklesIcon} className="size-4" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="text-sm font-semibold leading-tight">AI Copilot</div>
					<div className="text-muted-foreground truncate text-xs">
						Video editing assistant & smart scriptwriter
					</div>
				</div>
				<ApiKeysButton className="h-7 gap-1 px-2 text-[11px]" />
				{onClose ? (
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						aria-label="Close AI Studio"
					>
						<HugeiconsIcon icon={Cancel01Icon} className="size-4" />
					</Button>
				) : null}
			</div>

			{/* Transcript */}
			<ScrollArea ref={scrollRef} className="min-h-0 flex-1 px-3 py-3">
				{messages.length === 0 && !busy ? (
					<EmptyState onPick={(cmd) => void handleSendMessage(cmd)} />
				) : (
					<div className="flex flex-col gap-3">
						{messages.map((m) => (
							<MessageBubble
								key={m.id}
								message={m}
								busy={busy}
								onGenerateClip={(args) => void generateClip(args)}
								onImport={requestImport}
								onCopyPrompt={(scene) => void copyPrompt(scene)}
								onAutoProduce={(dir) => void runScriptPipeline(dir.concept, dir)}
							/>
						))}
						{busy ? <PendingBubble label={pendingLabel} /> : null}
					</div>
				)}
			</ScrollArea>

			{/* Quick Action Chips & Composer */}
			<div className="border-t p-3 space-y-2">
				{/* Quick Actions Bar */}
				<div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
					{QUICK_ACTIONS.map((item) => (
						<button
							key={item.label}
							type="button"
							disabled={busy}
							onClick={() => void handleSendMessage(item.cmd)}
							className="bg-accent/60 hover:bg-accent text-foreground/80 hover:text-foreground shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50"
						>
							{item.label}
						</button>
					))}
				</div>

				<div className="relative">
					<Textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={onKeyDown}
						placeholder="Ask to cut video ('cut here', 'cut every 3s') or write a script..."
						rows={2}
						disabled={busy}
						className="min-h-[52px] pr-11 text-xs"
					/>
					<Button
						size="icon"
						onClick={() => void handleSendMessage(input)}
						disabled={busy || input.trim().length === 0}
						aria-label="Send"
						className="absolute bottom-2 right-2 size-7"
					>
						<HugeiconsIcon
							icon={busy ? Loading03Icon : ArrowUp01Icon}
							className={cn("size-3.5", busy && "animate-spin")}
						/>
					</Button>
				</div>
				<p className="text-muted-foreground text-[10px] leading-snug">
					Type cuts like <strong>cut at 5s</strong>, <strong>split left</strong>, <strong>cut every 3s</strong>, or click <strong>Auto-Produce from Analytics</strong>.
				</p>
			</div>
		</div>
	);
}

function EmptyState({ onPick }: { onPick: (cmd: string) => void }) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
			<div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
				<HugeiconsIcon icon={SparklesIcon} className="size-6" />
			</div>
			<div>
				<div className="text-sm font-medium">AI Video Copilot</div>
				<div className="text-muted-foreground mx-auto mt-1 max-w-[16rem] text-xs">
					Control the timeline with natural language or generate full video concepts from analytics.
				</div>
			</div>
			<div className="flex flex-col gap-1.5 w-full max-w-[20rem]">
				{SUGGESTIONS.map((s) => (
					<button
						key={s}
						type="button"
						onClick={() => onPick(s.replace(/^[^\w]+/, ""))}
						className="border-border hover:bg-accent bg-accent/30 rounded-lg border px-3 py-2 text-left text-xs transition-colors"
					>
						{s}
					</button>
				))}
			</div>
		</div>
	);
}

function PendingBubble({ label }: { label: string }) {
	return (
		<div className="bg-accent/60 text-muted-foreground flex items-center gap-2 self-start rounded-lg px-3 py-2 text-xs">
			<HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin" />
			<span>{label || "Working…"}</span>
		</div>
	);
}

function AnalysisCard({
	report,
	onAutoProduce,
	busy,
}: {
	report: AnalysisReport;
	onAutoProduce: (directive: ProductionDirective) => void;
	busy: boolean;
}) {
	const statusBadge =
		report.diagnostic.status === "strong_growth"
			? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
			: report.diagnostic.status === "needs_recalibration"
				? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
				: "bg-primary/10 text-primary border-primary/20";

	return (
		<div className="bg-accent/40 border-border w-full self-start rounded-lg border p-3 text-xs space-y-2.5">
			<div className="flex items-center justify-between gap-2">
				<div className="text-muted-foreground flex items-center gap-1.5 font-semibold uppercase tracking-wide text-[11px]">
					<HugeiconsIcon icon={SparklesIcon} className="size-3.5 text-primary" />
					ADK2 Intelligence: {report.channelName}
				</div>
				<span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border", statusBadge)}>
					{report.diagnostic.status.replace("_", " ")}
				</span>
			</div>

			<p className="text-foreground/90 leading-snug">{report.diagnostic.summary}</p>

			<div className="grid grid-cols-2 gap-2">
				<div className="bg-background/50 border-border/70 rounded-md border p-2">
					<div className="text-muted-foreground text-[10px] font-semibold uppercase">Top Strength</div>
					<div className="font-medium text-foreground mt-0.5 leading-snug">{report.diagnostic.topStrength}</div>
				</div>
				<div className="bg-background/50 border-border/70 rounded-md border p-2">
					<div className="text-muted-foreground text-[10px] font-semibold uppercase">Dropoff Risk</div>
					<div className="font-medium text-foreground mt-0.5 leading-snug">{report.diagnostic.criticalDropoffReason}</div>
				</div>
			</div>

			<Section title="Empirical Learnings">
				<ul className="list-disc space-y-0.5 pl-4">
					{report.keyLearnings.whatWorked.map((item, i) => (
						<li key={i} className="text-emerald-600 dark:text-emerald-400 font-medium leading-snug">{item}</li>
					))}
					{report.keyLearnings.whatFailed.map((item, i) => (
						<li key={i} className="text-muted-foreground leading-snug">{item}</li>
					))}
				</ul>
			</Section>

			<div className="border-primary/30 bg-primary/5 rounded-lg border p-2.5 space-y-1.5">
				<div className="flex items-center justify-between gap-2">
					<div className="text-primary font-semibold text-[11px] uppercase tracking-wide">
						Recommended Video Blueprint
					</div>
					<Button
						size="sm"
						variant="default"
						className="h-6 gap-1 px-2.5 text-[11px]"
						disabled={busy}
						onClick={() => onAutoProduce(report.nextVideoBlueprint)}
					>
						<HugeiconsIcon icon={SparklesIcon} className="size-3" />
						Auto-Produce
					</Button>
				</div>
				<div className="font-medium text-foreground text-xs">
					"{report.nextVideoBlueprint.title}"
				</div>
				<div className="text-muted-foreground text-[11px]">
					Hook: <span className="italic">{report.nextVideoBlueprint.hookStrategy}</span> · ~{report.nextVideoBlueprint.targetDurationSeconds}s
				</div>
			</div>
		</div>
	);
}

function BoomingRadarCard({
	metas,
	onSelectMeta,
	busy,
}: {
	metas: BoomingCreatorMeta[];
	onSelectMeta: (meta: BoomingCreatorMeta) => void;
	busy: boolean;
}) {
	return (
		<div className="bg-accent/40 border-border w-full self-start rounded-lg border p-3 text-xs space-y-3">
			<div className="flex items-center justify-between gap-2 border-b pb-2">
				<div className="text-foreground flex items-center gap-1.5 font-bold uppercase tracking-wide text-[11px]">
					<HugeiconsIcon icon={SparklesIcon} className="size-3.5 text-primary" />
					🔥 Live Booming Creator Radar
				</div>
				<span className="text-[10px] text-muted-foreground font-mono">
					Live 2026 Meta
				</span>
			</div>

			<p className="text-muted-foreground text-[11px] leading-snug">
				Fastest-growing formats and retention hooks top creators are using right now:
			</p>

			<div className="flex flex-col gap-2">
				{metas.map((meta, i) => (
					<div
						key={i}
						className="bg-background/60 border-border/80 rounded-lg border p-2.5 space-y-1.5 transition-all hover:border-primary/50"
					>
						<div className="flex items-center justify-between gap-2">
							<div className="font-semibold text-foreground text-xs">
								{meta.title}
							</div>
							<span className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded-full font-medium">
								{meta.niche}
							</span>
						</div>
						<div className="text-muted-foreground text-[11px] leading-snug">
							Hook: <span className="text-foreground italic font-medium">"{meta.hookTemplate}"</span>
						</div>
						<div className="text-[10px] text-muted-foreground">
							Pacing: <span className="text-foreground/80">{meta.pacingStyle}</span> · ~{meta.targetDurationSeconds}s
						</div>
						<div className="flex items-center justify-between pt-1">
							<span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
								💡 {meta.whyItWorks}
							</span>
							<Button
								size="sm"
								variant="default"
								className="h-6 gap-1 px-2 text-[11px]"
								disabled={busy}
								onClick={() => onSelectMeta(meta)}
							>
								<HugeiconsIcon icon={SparklesIcon} className="size-3" />
								Produce
							</Button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function MessageBubble({
	message,
	busy,
	onGenerateClip,
	onImport,
	onCopyPrompt,
	onAutoProduce,
}: {
	message: ChatMessage;
	busy: boolean;
	onGenerateClip: (args: { script: VideoScript; scene: Scene }) => void;
	onImport: (args: { script: VideoScript; scene: Scene }) => void;
	onCopyPrompt: (scene: Scene) => void;
	onAutoProduce: (directive: ProductionDirective) => void;
}) {
	if (message.role === "user") {
		return (
			<div className="bg-primary text-primary-foreground max-w-[85%] self-end rounded-lg rounded-br-sm px-3 py-2 text-xs">
				{message.text}
			</div>
		);
	}
	if (message.role === "assistant") {
		return (
			<div className="bg-accent/60 text-foreground/90 border border-border/60 max-w-[90%] self-start rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap">
				{message.text}
			</div>
		);
	}
	if (message.role === "action") {
		return (
			<div className="bg-primary/10 border-primary/20 text-foreground font-medium flex items-center gap-2 self-start rounded-lg border px-3 py-2 text-xs">
				<span>{message.summary}</span>
			</div>
		);
	}
	if (message.role === "booming") {
		return (
			<BoomingRadarCard
				metas={message.metas}
				busy={busy}
				onSelectMeta={(m) =>
					onAutoProduce({
						title: m.title,
						hookStrategy: m.hookTemplate,
						targetDurationSeconds: m.targetDurationSeconds,
						concept: m.recommendedConcept,
						visualStyle: m.title,
						pacing: m.pacingStyle,
						keywords: [m.niche],
					})
				}
			/>
		);
	}
	if (message.role === "analysis") {
		return (
			<AnalysisCard
				report={message.report}
				busy={busy}
				onAutoProduce={onAutoProduce}
			/>
		);
	}
	if (message.role === "error") {
		return (
			<div className="bg-destructive/10 text-destructive max-w-[90%] self-start rounded-lg px-3 py-2 text-xs">
				{message.text}
			</div>
		);
	}
	if (message.role === "trend") {
		return <TrendCard report={message.report} />;
	}
	if (message.role === "script") {
		return (
			<ScriptCard
				script={message.script}
				busy={busy}
				onGenerateClip={onGenerateClip}
				onImport={onImport}
				onCopyPrompt={onCopyPrompt}
			/>
		);
	}
	if (message.role === "clip-error") {
		return (
			<ClipErrorCard
				message={message}
				busy={busy}
				onGenerateClip={onGenerateClip}
				onImport={onImport}
				onCopyPrompt={onCopyPrompt}
			/>
		);
	}
	return (
		<div className="bg-primary/10 text-foreground/90 flex items-center gap-2 self-start rounded-lg px-3 py-2 text-xs">
			<HugeiconsIcon icon={SparklesIcon} className="text-primary size-4" />
			<span>
				Added scene {message.sceneIndex} to your timeline
				{message.hasAudio ? " with voiceover" : ""}.
			</span>
		</div>
	);
}

/**
 * The two buttons that drive the free AI-Studio path for a scene: copy its
 * visual prompt (to paste into aistudio.google.com) and import the file you
 * make there back onto that scene's timeline slot.
 */
function SceneImportButtons({
	script,
	scene,
	busy,
	onImport,
	onCopyPrompt,
}: {
	script: VideoScript;
	scene: Scene;
	busy: boolean;
	onImport: (args: { script: VideoScript; scene: Scene }) => void;
	onCopyPrompt: (scene: Scene) => void;
}) {
	return (
		<>
			<Button
				size="sm"
				variant="ghost"
				className="h-6 gap-1 px-2 text-[11px]"
				onClick={() => onCopyPrompt(scene)}
			>
				<HugeiconsIcon icon={Copy01Icon} className="size-3" />
				Copy prompt
			</Button>
			<Button
				size="sm"
				variant="ghost"
				className="h-6 gap-1 px-2 text-[11px]"
				disabled={busy}
				onClick={() => onImport({ script, scene })}
			>
				<HugeiconsIcon icon={Upload03Icon} className="size-3" />
				Import
			</Button>
		</>
	);
}

/**
 * A clip that failed to generate. Unlike a plain error bubble, this keeps the
 * failing scene in reach: retry the paid Veo call, or take the free path —
 * copy the prompt into Google AI Studio and import the result onto this scene.
 */
function ClipErrorCard({
	message,
	busy,
	onGenerateClip,
	onImport,
	onCopyPrompt,
}: {
	message: Extract<ChatMessage, { role: "clip-error" }>;
	busy: boolean;
	onGenerateClip: (args: { script: VideoScript; scene: Scene }) => void;
	onImport: (args: { script: VideoScript; scene: Scene }) => void;
	onCopyPrompt: (scene: Scene) => void;
}) {
	const { retry, isQuota, text } = message;
	return (
		<div className="bg-destructive/10 border-destructive/30 text-destructive w-full max-w-[90%] self-start rounded-lg border p-3 text-sm">
			<div className="font-medium">
				{isQuota
					? `Scene ${retry.scene.index}: video is quota-limited`
					: `Scene ${retry.scene.index}: couldn’t generate the clip`}
			</div>
			<p className="mt-1 text-[13px] leading-snug">{text}</p>
			{isQuota ? (
				<p className="text-foreground/70 mt-1.5 text-[12px] leading-snug">
					Your trend brief and script above are ready — only the paid Veo call
					is blocked. Make this scene free in{" "}
					<a
						href="https://aistudio.google.com"
						target="_blank"
						rel="noreferrer"
						className="underline underline-offset-2"
					>
						Google AI Studio
					</a>
					: copy the prompt, generate it there, then import the file below.
				</p>
			) : null}
			<div className="mt-2 flex flex-wrap items-center gap-1.5">
				<Button
					size="sm"
					variant="secondary"
					className="h-7 gap-1 px-2 text-[11px]"
					disabled={busy}
					onClick={() =>
						onGenerateClip({ script: retry.script, scene: retry.scene })
					}
				>
					<HugeiconsIcon
						icon={busy ? Loading03Icon : SparklesIcon}
						className={cn("size-3", busy && "animate-spin")}
					/>
					Retry Veo
				</Button>
				<SceneImportButtons
					script={retry.script}
					scene={retry.scene}
					busy={busy}
					onImport={onImport}
					onCopyPrompt={onCopyPrompt}
				/>
			</div>
		</div>
	);
}

function TrendCard({ report }: { report: TrendReport }) {
	return (
		<div className="bg-accent/40 border-border w-full self-start rounded-lg border p-3 text-sm">
			<div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
				<HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
				Trend brief
			</div>

			<p className="text-foreground/90 leading-snug">{report.summary}</p>

			<div className="mt-2.5 flex flex-wrap gap-1.5">
				<Chip>{report.targetPlatform}</Chip>
				<Chip>{report.aspectRatio}</Chip>
				<Chip>{report.recommendedDurationSeconds}s</Chip>
			</div>

			<Section title="Hooks">
				<ul className="list-disc space-y-0.5 pl-4">
					{report.hooks?.map((h, i) => (
						<li key={i}>{h}</li>
					))}
				</ul>
			</Section>

			{report.contentFormats?.length ? (
				<Section title="Formats">
					<div className="flex flex-wrap gap-1.5">
						{report.contentFormats.map((f, i) => (
							<Chip key={i}>{f}</Chip>
						))}
					</div>
				</Section>
			) : null}

			<Section title="Visual style">
				<p className="leading-snug">{report.visualStyle}</p>
			</Section>

			<Section title="Audio style">
				<p className="leading-snug">{report.audioStyle}</p>
			</Section>

			<Section title="Pacing">
				<p className="leading-snug">{report.pacing}</p>
			</Section>

			{report.scriptBrief ? (
				<Section title="Script brief">
					<p className="leading-snug">
						<span className="text-muted-foreground">Structure:</span>{" "}
						{report.scriptBrief.structure}
					</p>
					<p className="leading-snug">
						<span className="text-muted-foreground">Voice:</span>{" "}
						{report.scriptBrief.voice}
					</p>
					<p className="leading-snug">
						<span className="text-muted-foreground">CTA:</span>{" "}
						{report.scriptBrief.callToAction}
					</p>
				</Section>
			) : null}

			{report.toneKeywords?.length ? (
				<Section title="Tone">
					<div className="flex flex-wrap gap-1.5">
						{report.toneKeywords.map((t, i) => (
							<Chip key={i}>{t}</Chip>
						))}
					</div>
				</Section>
			) : null}

			{report.insights?.length ? (
				<Section title="Why it works">
					<ul className="space-y-1.5">
						{report.insights.map((ins, i) => (
							<li key={i} className="leading-snug">
								<span className="font-medium">{ins.pattern}</span>
								<span className="text-muted-foreground"> — {ins.why}</span>
							</li>
						))}
					</ul>
				</Section>
			) : null}
		</div>
	);
}

function ScriptCard({
	script,
	busy,
	onGenerateClip,
	onImport,
	onCopyPrompt,
}: {
	script: VideoScript;
	busy: boolean;
	onGenerateClip: (args: { script: VideoScript; scene: Scene }) => void;
	onImport: (args: { script: VideoScript; scene: Scene }) => void;
	onCopyPrompt: (scene: Scene) => void;
}) {
	return (
		<div className="bg-accent/40 border-border w-full self-start rounded-lg border p-3 text-sm">
			<div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
				<HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
				Script
			</div>

			<div className="text-foreground font-medium leading-snug">
				{script.title}
			</div>
			<div className="mt-1.5 flex flex-wrap gap-1.5">
				<Chip>{script.aspectRatio}</Chip>
				<Chip>~{script.estimatedDurationSeconds}s</Chip>
				<Chip>{script.scenes?.length ?? 0} scenes</Chip>
			</div>

			<div className="mt-3 flex flex-col gap-2">
				{script.scenes?.map((scene) => (
					<div
						key={scene.index}
						className="border-border/70 bg-background/40 rounded-md border p-2"
					>
						<div className="mb-1 flex items-center justify-between gap-2">
							<span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
								Scene {scene.index} · {scene.durationSeconds}s
							</span>
							<Button
								size="sm"
								variant="secondary"
								className="h-6 gap-1 px-2 text-[11px]"
								disabled={busy}
								onClick={() => onGenerateClip({ script, scene })}
							>
								<HugeiconsIcon
									icon={busy ? Loading03Icon : SparklesIcon}
									className={cn("size-3", busy && "animate-spin")}
								/>
								Generate
							</Button>
						</div>
						<p className="text-foreground/80 text-[12px] leading-snug">
							{scene.visualPrompt}
						</p>
						{scene.voiceover ? (
							<p className="text-foreground/90 mt-1 text-[12px] italic leading-snug">
								“{scene.voiceover}”
							</p>
						) : null}
						<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
							<SceneImportButtons
								script={script}
								scene={scene}
								busy={busy}
								onImport={onImport}
								onCopyPrompt={onCopyPrompt}
							/>
						</div>
					</div>
				))}
			</div>

			<p className="text-muted-foreground mt-2 text-[11px] leading-snug">
				“Generate” uses paid Veo. Free path: Copy prompt →{" "}
				<a
					href="https://aistudio.google.com"
					target="_blank"
					rel="noreferrer"
					className="underline underline-offset-2"
				>
					AI Studio
				</a>{" "}
				→ Import the file onto that scene (voiceover is added free).
			</p>
		</div>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="mt-3">
			<div className="text-muted-foreground mb-1 text-[11px] font-semibold uppercase tracking-wide">
				{title}
			</div>
			<div className="text-foreground/90 text-[13px]">{children}</div>
		</div>
	);
}

function Chip({ children }: { children: React.ReactNode }) {
	return (
		<span className="bg-background border-border rounded-full border px-2 py-0.5 text-xs">
			{children}
		</span>
	);
}

/** Map a failed AI response to a user-facing line. */
function errorText({
	status,
	data,
}: {
	status: number;
	data: { message?: string } | null;
}): string {
	if (data?.message) return data.message;
	if (status === 503) return "AI Studio isn't configured on the server yet.";
	if (status === 429)
		return "Google's AI quota is exhausted. Wait for it to reset or enable billing on your Gemini API project, then try again.";
	return `Request failed (${status}).`;
}
