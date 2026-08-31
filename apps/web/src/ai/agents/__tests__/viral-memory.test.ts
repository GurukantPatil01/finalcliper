import { describe, expect, it } from "bun:test";
import {
	getActiveViralPatterns,
	getEvolvingMetaPrompt,
	recordLearnedPattern,
	reinforcePattern,
} from "../viral-memory";
import { matchLocalEditorCommand } from "@/ai/chat/copilot-parser";

describe("Evolving Viral Creator Memory", () => {
	it("initializes with active booming creator patterns", () => {
		const patterns = getActiveViralPatterns();
		expect(patterns.length).toBeGreaterThanOrEqual(4);
		expect(patterns[0].confidenceScore).toBeGreaterThanOrEqual(patterns[1].confidenceScore);
	});

	it("builds an evolving meta prompt for agent injection", () => {
		const prompt = getEvolvingMetaPrompt();
		expect(prompt).toContain("CURRENTLY BOOMING CREATOR METAS");
		expect(prompt).toContain("Extreme Negative Consequence Hook");
	});

	it("reinforces pattern confidence on success", () => {
		const initialScore = getActiveViralPatterns()[0].confidenceScore;
		const id = getActiveViralPatterns()[0].id;
		reinforcePattern(id, 0.05);
		const updated = getActiveViralPatterns().find((p) => p.id === id);
		expect(updated?.confidenceScore).toBeGreaterThanOrEqual(initialScore);
	});

	it("records newly learned creator patterns dynamically", () => {
		const newPattern = recordLearnedPattern({
			title: "Split-Screen AI Reaction Loop",
			category: "visual_style",
			description: "Top half shows high-retention gameplay, bottom half shows fast-paced reaction.",
			confidenceScore: 0.95,
			example: "Subway Surfers bottom + Tech drama top.",
		});

		expect(newPattern.id).toBeDefined();
		const all = getActiveViralPatterns();
		expect(all.some((p) => p.title === "Split-Screen AI Reaction Loop")).toBe(true);
	});

	it("matches booming radar copilot command", () => {
		expect(matchLocalEditorCommand("booming")).toEqual({ type: "booming_radar" });
		expect(matchLocalEditorCommand("what's booming")).toEqual({ type: "booming_radar" });
		expect(matchLocalEditorCommand("viral radar")).toEqual({ type: "booming_radar" });
		expect(matchLocalEditorCommand("/booming")).toEqual({ type: "booming_radar" });
	});
});
