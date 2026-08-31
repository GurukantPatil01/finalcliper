import { describe, expect, it } from "bun:test";
import { matchLocalEditorCommand } from "../copilot-parser";

describe("AI Copilot Command Matching", () => {
	it("matches playhead cut commands", () => {
		expect(matchLocalEditorCommand("cut")).toEqual({ type: "cut_at_playhead" });
		expect(matchLocalEditorCommand("split")).toEqual({ type: "cut_at_playhead" });
		expect(matchLocalEditorCommand("/cut")).toEqual({ type: "cut_at_playhead" });
		expect(matchLocalEditorCommand("cut here")).toEqual({ type: "cut_at_playhead" });
		expect(matchLocalEditorCommand("split clip")).toEqual({ type: "cut_at_playhead" });
	});

	it("matches time-specific cuts", () => {
		expect(matchLocalEditorCommand("cut at 5s")).toEqual({
			type: "cut_at_time",
			timeSeconds: 5,
		});
		expect(matchLocalEditorCommand("split at 12.5 seconds")).toEqual({
			type: "cut_at_time",
			timeSeconds: 12.5,
		});
		expect(matchLocalEditorCommand("cut at 01:30")).toEqual({
			type: "cut_at_time",
			timeSeconds: 90,
		});
	});

	it("matches periodic interval cuts", () => {
		expect(matchLocalEditorCommand("cut every 3s")).toEqual({
			type: "cut_interval",
			intervalSeconds: 3,
		});
		expect(matchLocalEditorCommand("split every 2 seconds")).toEqual({
			type: "cut_interval",
			intervalSeconds: 2,
		});
	});

	it("matches split left/right trims", () => {
		expect(matchLocalEditorCommand("split left")).toEqual({ type: "split_left" });
		expect(matchLocalEditorCommand("trim right")).toEqual({ type: "split_right" });
	});

	it("matches playback and navigation", () => {
		expect(matchLocalEditorCommand("play")).toEqual({ type: "toggle_playback" });
		expect(matchLocalEditorCommand("pause")).toEqual({ type: "toggle_playback" });
		expect(matchLocalEditorCommand("jump to start")).toEqual({ type: "seek", timeSeconds: 0 });
		expect(matchLocalEditorCommand("seek to 15s")).toEqual({ type: "seek", timeSeconds: 15 });
	});

	it("matches explicit script prompt", () => {
		expect(matchLocalEditorCommand("/script finance hacks")).toEqual({
			type: "generate_script",
			topic: "finance hacks",
		});
	});
});
