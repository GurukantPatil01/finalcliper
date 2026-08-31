/**
 * Wrap raw PCM samples in a minimal WAV (RIFF) container.
 *
 * Gemini TTS returns headerless PCM (mono, 24 kHz, 16-bit signed little-endian).
 * The editor's media import needs a decodable container, so we prepend the
 * canonical 44-byte WAV header. Pure Node — no external dependency.
 */
export function pcmToWav({
	pcm,
	sampleRate,
	channels,
	bitsPerSample,
}: {
	pcm: Buffer;
	sampleRate: number;
	channels: number;
	bitsPerSample: number;
}): Buffer {
	const blockAlign = (channels * bitsPerSample) / 8;
	const byteRate = sampleRate * blockAlign;
	const dataSize = pcm.length;

	const header = Buffer.alloc(44);
	header.write("RIFF", 0); // ChunkID
	header.writeUInt32LE(36 + dataSize, 4); // ChunkSize
	header.write("WAVE", 8); // Format
	header.write("fmt ", 12); // Subchunk1ID
	header.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
	header.writeUInt16LE(1, 20); // AudioFormat = PCM
	header.writeUInt16LE(channels, 22); // NumChannels
	header.writeUInt32LE(sampleRate, 24); // SampleRate
	header.writeUInt32LE(byteRate, 28); // ByteRate
	header.writeUInt16LE(blockAlign, 32); // BlockAlign
	header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
	header.write("data", 36); // Subchunk2ID
	header.writeUInt32LE(dataSize, 40); // Subchunk2Size

	return Buffer.concat([header, pcm]);
}
