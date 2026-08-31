/**
 * Agent 2 — Audio / voiceover generator (Gemini TTS).
 *
 * Speaks a single scene's narration line. Gemini TTS returns headerless PCM
 * (mono, 24 kHz, 16-bit LE), which we wrap in a WAV container so the editor can
 * import it as a normal audio clip laid under the Veo video.
 */
import { getGenAI } from "../client/genai";
import { MODELS } from "../client/models";
import { pcmToWav } from "../client/pcm-wav";

/** Gemini TTS output format (fixed by the API). */
const TTS_SAMPLE_RATE = 24_000;
const TTS_CHANNELS = 1;
const TTS_BITS_PER_SAMPLE = 16;

/** A warm, confident default from Gemini's prebuilt voice set. */
const DEFAULT_VOICE = "Kore";

export async function synthesizeVoice({
	text,
	voiceDirection,
	voiceName = DEFAULT_VOICE,
	apiKey,
}: {
	text: string;
	voiceDirection?: string;
	voiceName?: string;
	apiKey?: string;
}): Promise<Buffer> {
	const ai = getGenAI(apiKey);

	// Gemini TTS supports natural-language style control by prefixing the text.
	const prompt = voiceDirection
		? `Say the following in a ${voiceDirection} tone: ${text}`
		: text;

	const response = await ai.models.generateContent({
		model: MODELS.tts,
		contents: prompt,
		config: {
			responseModalities: ["AUDIO"],
			speechConfig: {
				voiceConfig: {
					prebuiltVoiceConfig: { voiceName },
				},
			},
		},
	});

	const base64 =
		response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
	if (!base64) {
		throw new Error("Voiceover generation returned no audio.");
	}

	const pcm = Buffer.from(base64, "base64");
	return pcmToWav({
		pcm,
		sampleRate: TTS_SAMPLE_RATE,
		channels: TTS_CHANNELS,
		bitsPerSample: TTS_BITS_PER_SAMPLE,
	});
}
