/**
 * Agent 3 — Video generator (Veo).
 *
 * Turns a single scene's visual prompt into an ~8-second video clip. Veo is a
 * long-running operation: we kick it off, poll until it's done, then download
 * the resulting MP4 and hand the bytes back to the route to stream.
 *
 * Audio note: the pipeline uses a separate TTS voiceover (see voice-generator),
 * so Veo's job here is the visual bed. Its own native audio (ambience/SFX) is
 * kept — the voiceover is layered on a separate timeline track on top of it.
 */
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { getGenAI } from "../client/genai";
import { MODELS } from "../client/models";

/** How often to poll the Veo operation, and the ceiling before we give up. */
const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 36; // ~6 minutes

export async function generateVideoClip({
	visualPrompt,
	aspectRatio,
	apiKey,
}: {
	visualPrompt: string;
	aspectRatio: string;
	apiKey?: string;
}): Promise<Buffer> {
	const ai = getGenAI(apiKey);

	// Veo accepts a small set of ratios; default to vertical short-form.
	const ratio = aspectRatio === "16:9" ? "16:9" : "9:16";

	let operation = await ai.models.generateVideos({
		model: MODELS.video,
		prompt: visualPrompt,
		config: {
			aspectRatio: ratio,
			numberOfVideos: 1,
		},
	});

	let polls = 0;
	while (!operation.done) {
		if (polls >= MAX_POLLS) {
			throw new Error(
				"Video generation timed out after several minutes. Please try again.",
			);
		}
		polls += 1;
		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
		operation = await ai.operations.getVideosOperation({ operation });
	}

	const video = operation.response?.generatedVideos?.[0]?.video;
	if (!video) {
		throw new Error(
			"Veo returned no video for this prompt (it may have been blocked by safety filters).",
		);
	}

	// The SDK downloads the (authenticated) generated-file URI to disk; we read
	// the bytes back to stream them, then clean up the temp file.
	const tmpPath = path.join(os.tmpdir(), `veo-${randomUUID()}.mp4`);
	await ai.files.download({ file: video, downloadPath: tmpPath });
	try {
		return await readFile(tmpPath);
	} finally {
		await unlink(tmpPath).catch(() => {
			/* best-effort cleanup */
		});
	}
}
