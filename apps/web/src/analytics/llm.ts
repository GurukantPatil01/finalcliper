/**
 * Server-only LLM client for analytics reports — provider-agnostic.
 *
 * Priority:
 *   1. OpenAI-compatible endpoint (LLM_BASE_URL + LLM_API_KEY + LLM_MODEL)
 *      — works with Z.ai GLM, OpenAI, and any compatible gateway.
 *   2. Gemini via the shared `@/ai/client/genai` factory (GEMINI_API_KEY).
 *
 * If neither is configured the route returns `llm_unavailable` and the client
 * falls back to the pure rule-based report — the feature never silently dies.
 *
 * SECURITY CONTRACT (docs/DECISIONS.md): keys live only in the server env;
 * LLM_BASE_URL is operator-provided so no vendor host literal is hardcoded
 * here (except Gemini, which is already a gated host).
 */
import { getGenAI } from "@/ai/client/genai";

export type LlmSource = "openai-compatible" | "gemini";

export class LlmUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "LlmUnavailableError";
	}
}

export interface LlmTextResult {
	text: string;
	source: LlmSource;
}

export function isLlmConfigured(): boolean {
	return Boolean(
		(process.env.LLM_BASE_URL && process.env.LLM_API_KEY && process.env.LLM_MODEL) ||
			process.env.GEMINI_API_KEY,
	);
}

/** Calls the configured LLM with a system + user prompt, returns text. */
export async function generateText(params: {
	system: string;
	user: string;
}): Promise<LlmTextResult> {
	const { baseUrl, apiKey, model } = openAiCompatibleConfig();
	if (baseUrl && apiKey && model) {
		return {
			text: await callOpenAiCompatible({ baseUrl, apiKey, model, ...params }),
			source: "openai-compatible",
		};
	}
	if (process.env.GEMINI_API_KEY) {
		return { text: await callGemini(params), source: "gemini" };
	}
	throw new LlmUnavailableError(
		"No LLM is configured. Set LLM_BASE_URL + LLM_API_KEY + LLM_MODEL " +
			"(any OpenAI-compatible endpoint) or GEMINI_API_KEY; without one, " +
			"reports fall back to the rule-based generator.",
	);
}

function openAiCompatibleConfig(): {
	baseUrl?: string;
	apiKey?: string;
	model?: string;
} {
	const baseUrl = process.env.LLM_BASE_URL?.trim().replace(/\/+$/, "");
	const apiKey = process.env.LLM_API_KEY?.trim();
	const model = process.env.LLM_MODEL?.trim();
	return { baseUrl, apiKey, model };
}

async function callOpenAiCompatible(params: {
	baseUrl: string;
	apiKey: string;
	model: string;
	system: string;
	user: string;
}): Promise<string> {
	const res = await fetch(`${params.baseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${params.apiKey}`,
		},
		body: JSON.stringify({
			model: params.model,
			max_tokens: 1500,
			temperature: 0.4,
			messages: [
				{ role: "system", content: params.system },
				{ role: "user", content: params.user },
			],
		}),
	});
	const body: unknown = await res.json().catch(() => null);
	if (!res.ok) {
		const err = body as { error?: { message?: string } } | null;
		throw new Error(
			`LLM request failed (HTTP ${res.status}): ${err?.error?.message ?? "unknown error"}`,
		);
	}
	const text = (body as { choices?: { message?: { content?: string } }[] } | null)
		?.choices?.[0]?.message?.content;
	if (!text) throw new Error("LLM returned an empty completion.");
	return text;
}

async function callGemini(params: { system: string; user: string }): Promise<string> {
	const ai = getGenAI();
	const response = await ai.models.generateContent({
		model: "gemini-2.0-flash",
		contents: params.user,
		config: {
			systemInstruction: params.system,
			temperature: 0.4,
		},
	});
	if (!response.text) throw new Error("Gemini returned an empty response.");
	return response.text;
}
