import type { EditorCore } from "@/core";
import { getElementsAtTime } from "@/timeline";
import {
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	type MediaTime,
} from "@/wasm";
import { invokeAction } from "@/actions";
import type { CopilotAction } from "@/app/api/ai/chat/route";

export interface ExecutionResult {
	success: boolean;
	summary: string;
	actionType?: string;
}

/** Format seconds to mm:ss.s format */
export function formatSecondsTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = (seconds % 60).toFixed(1);
	return `${String(mins).padStart(2, "0")}:${Number(secs) < 10 ? "0" : ""}${secs}`;
}

export function formatMediaTime(time: MediaTime): string {
	return formatSecondsTime(mediaTimeToSeconds({ time }));
}

/** Executes a discrete timeline action on the editor */
export function executeCopilotAction(
	action: CopilotAction,
	editor: EditorCore,
): ExecutionResult {
	const scene = editor.scenes.getActiveSceneOrNull();
	if (!scene) {
		return { success: false, summary: "No active scene loaded." };
	}

	const currentTime = editor.playback.getCurrentTime();
	const selectedElements = editor.selection.getSelectedElements();

	switch (action.type) {
		case "cut_at_playhead": {
			const elementsToSplit =
				selectedElements.length > 0
					? selectedElements
					: getElementsAtTime({
							tracks: scene.tracks,
							time: currentTime,
						});

			if (elementsToSplit.length === 0) {
				return {
					success: false,
					summary: `No clips found at the current playhead (${formatMediaTime(currentTime)}) to cut.`,
				};
			}

			editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: currentTime,
			});

			return {
				success: true,
				actionType: "cut",
				summary: `✂️ Cut ${elementsToSplit.length} clip(s) at ${formatMediaTime(currentTime)}.`,
			};
		}

		case "cut_at_time": {
			const targetSeconds = Math.max(0, action.timeSeconds);
			const targetTime = mediaTimeFromSeconds({ seconds: targetSeconds });
			const elementsToSplit = getElementsAtTime({
				tracks: scene.tracks,
				time: targetTime,
			});

			if (elementsToSplit.length === 0) {
				return {
					success: false,
					summary: `No clips found at ${formatSecondsTime(targetSeconds)} to cut.`,
				};
			}

			editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: targetTime,
			});
			editor.playback.seek({ time: targetTime });

			return {
				success: true,
				actionType: "cut",
				summary: `✂️ Cut ${elementsToSplit.length} clip(s) at ${formatSecondsTime(targetSeconds)}.`,
			};
		}

		case "cut_interval": {
			const interval = Math.max(1, action.intervalSeconds);
			const totalDuration = editor.timeline.getTotalDuration();
			const totalSeconds = mediaTimeToSeconds({ time: totalDuration });

			if (totalSeconds < interval) {
				return {
					success: false,
					summary: `Timeline duration (${formatSecondsTime(totalSeconds)}) is shorter than cut interval (${interval}s).`,
				};
			}

			let cutsCount = 0;
			for (let sec = interval; sec < totalSeconds; sec += interval) {
				const currentScene = editor.scenes.getActiveSceneOrNull();
				if (!currentScene) break;

				const splitTime = mediaTimeFromSeconds({ seconds: sec });
				const elementsToSplit = getElementsAtTime({
					tracks: currentScene.tracks,
					time: splitTime,
				});

				if (elementsToSplit.length > 0) {
					editor.timeline.splitElements({
						elements: elementsToSplit,
						splitTime,
					});
					cutsCount++;
				}
			}

			return {
				success: cutsCount > 0,
				actionType: "cut_interval",
				summary:
					cutsCount > 0
						? `⚡ Added ${cutsCount} rhythmic cuts every ${interval}s across the timeline.`
						: "No clips intersected the cut intervals.",
			};
		}

		case "split_left": {
			const elementsToSplit =
				selectedElements.length > 0
					? selectedElements
					: getElementsAtTime({
							tracks: scene.tracks,
							time: currentTime,
						});

			if (elementsToSplit.length === 0) {
				return { success: false, summary: "No clips found at playhead to split-left." };
			}

			editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: currentTime,
				retainSide: "right",
			});

			return {
				success: true,
				actionType: "split_left",
				summary: `✂️ Split and removed left portion of clip at ${formatMediaTime(currentTime)}.`,
			};
		}

		case "split_right": {
			const elementsToSplit =
				selectedElements.length > 0
					? selectedElements
					: getElementsAtTime({
							tracks: scene.tracks,
							time: currentTime,
						});

			if (elementsToSplit.length === 0) {
				return { success: false, summary: "No clips found at playhead to split-right." };
			}

			editor.timeline.splitElements({
				elements: elementsToSplit,
				splitTime: currentTime,
				retainSide: "left",
			});

			return {
				success: true,
				actionType: "split_right",
				summary: `✂️ Split and removed right portion of clip at ${formatMediaTime(currentTime)}.`,
			};
		}

		case "delete_selected": {
			invokeAction("delete-selected");
			return {
				success: true,
				actionType: "delete",
				summary: "🗑️ Deleted selected timeline items.",
			};
		}

		case "seek": {
			const targetSeconds = Math.max(0, action.timeSeconds);
			const targetTime = mediaTimeFromSeconds({ seconds: targetSeconds });
			editor.playback.seek({ time: targetTime });
			return {
				success: true,
				actionType: "seek",
				summary: `📍 Jumped playhead to ${formatSecondsTime(targetSeconds)}.`,
			};
		}

		case "toggle_playback": {
			editor.playback.toggle();
			const isPlaying = editor.playback.getIsPlaying();
			return {
				success: true,
				actionType: "playback",
				summary: isPlaying ? "▶️ Playback started." : "⏸️ Playback paused.",
			};
		}

		default:
			return { success: false, summary: "Unrecognized action." };
	}
}

export { matchLocalEditorCommand } from "./copilot-parser";
