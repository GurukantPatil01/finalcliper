/**
 * Hugging Face fallback for scene visuals — used when Veo (Agent 3) fails,
 * especially on a 429/quota. It tries text-to-video first *only if* a video
 * model is configured (there is no free HF video path — see hf.ts), then falls
 * back to a genuinely-near-free text-to-image still via the `hf-inference`
 * provider, which the free monthly credit can actually cover.
 *
 * Everything goes through the HF Inference Providers router as a raw `fetch`:
 * the @huggingface/inference SDK isn't installed and we can't add deps offline.
 * The `hf-inference` provider returns the generated media as raw bytes, so we
 * hand the buffer + its Content-Type back to the route to stream — exactly the
 * shape the Veo path already returns.
 */
import {
	HF_ROUTER_BASE,
	getHfToken,
	hfImageModel,
	hfVideoModel,
} from "../client/hf";

export interface HuggingFaceVisual {
	bytes: Buffer;
	/** MIME from the provider response, e.g. "video/mp4" or "image/jpeg". */
	contentType: string;
	kind: "video" | "image";
}

/** Map a short-form aspect ratio to SD-friendly (multiple-of-64) dimensions. */
function dimsFor(aspectRatio: string): { width: number; height: number } {
	if (aspectRatio === "16:9") return { width: 1344, height: 768 };
	if (aspectRatio === "9:16") return { width: 768, height: 1344 };
	return { width: 1024, height: 1024 };
}

/**
 * POST a text prompt to one hf-inference model and return the raw media bytes.
 * Throws on any non-2xx (with a short body snippet) or a JSON/empty body so the
 * caller can fall through to the next option.
 */
async function hfInference({
	model,
	inputs,
	parameters,
	expected,
}: {
	model: string;
	inputs: string;
	parameters: Record<string, unknown>;
	expected: "video" | "image";
}): Promise<HuggingFaceVisual> {
	const res = await fetch(`${HF_ROUTER_BASE}/hf-inference/models/${model}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${getHfToken()}`,
			"Content-Type": "application/json",
			Accept: expected === "video" ? "video/*" : "image/*",
		},
		body: JSON.stringify({ inputs, parameters }),
	});

	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(
			`Hugging Face ${expected} generation failed ` +
				`(${res.status} ${res.statusText})` +
				(detail ? `: ${detail.slice(0, 200)}` : ""),
		);
	}

	// A JSON body here is an error/status payload (e.g. "model is loading"),
	// not the generated media — treat it as a failure so we fall through.
	const contentType = res.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		const detail = await res.text().catch(() => "");
		throw new Error(
			`Hugging Face returned no ${expected} (JSON body): ${detail.slice(0, 200)}`,
		);
	}

	const bytes = Buffer.from(await res.arrayBuffer());
	if (bytes.length === 0) {
		throw new Error(`Hugging Face returned an empty ${expected}.`);
	}
	return {
		bytes,
		contentType:
			contentType || (expected === "video" ? "video/mp4" : "image/png"),
		kind: expected,
	};
}

/**
 * Try HF video (if HF_VIDEO_MODEL is set), then HF image. Throws only if the
 * attempted option(s) all fail. On a default free account this produces a
 * still image; with credits + a served video model it can produce a clip.
 */
export async function generateHuggingFaceVisual({
	visualPrompt,
	aspectRatio,
}: {
	visualPrompt: string;
	aspectRatio: string;
}): Promise<HuggingFaceVisual> {
	const prompt = visualPrompt.trim();
	const negativePrompt =
		"blurry, low quality, distorted, watermark, text, logo";

	const videoModel = hfVideoModel();
	if (videoModel) {
		try {
			return await hfInference({
				model: videoModel,
				inputs: prompt,
				// text-to-video's negative_prompt is a string[] per the HF task spec.
				parameters: { negative_prompt: [negativePrompt] },
				expected: "video",
			});
		} catch (err) {
			// Expected on a free account (no credits / model not served by
			// hf-inference) — fall through to the still image, which the free
			// tier can actually do.
			console.warn("HF video fallback failed, trying image:", err);
		}
	}

	const { width, height } = dimsFor(aspectRatio);
	return hfInference({
		model: hfImageModel(),
		inputs: prompt,
		parameters: { width, height, negative_prompt: negativePrompt },
		expected: "image",
	});
}
