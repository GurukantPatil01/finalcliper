/**
 * Defensive JSON extraction for model output.
 *
 * We ask Gemini for `application/json`, which is usually clean — but models
 * occasionally still wrap the payload in ```json fences or add a stray
 * sentence. This strips the common wrappers and parses, throwing a clear
 * error (with a truncated preview) when the text really isn't JSON.
 */
export function parseModelJson<T>(raw: string | undefined | null): T {
	if (!raw || !raw.trim()) {
		throw new Error("Model returned an empty response.");
	}
	let text = raw.trim();

	// Strip a leading/trailing markdown code fence if present.
	const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	if (fence) {
		text = fence[1].trim();
	}

	// If there's leading/trailing prose, grab the outermost {...} or [...].
	if (text[0] !== "{" && text[0] !== "[") {
		const firstObj = text.indexOf("{");
		const firstArr = text.indexOf("[");
		const start =
			firstArr === -1
				? firstObj
				: firstObj === -1
					? firstArr
					: Math.min(firstObj, firstArr);
		if (start > 0) {
			const lastObj = text.lastIndexOf("}");
			const lastArr = text.lastIndexOf("]");
			const end = Math.max(lastObj, lastArr);
			if (end > start) {
				text = text.slice(start, end + 1);
			}
		}
	}

	try {
		// Generic parse boundary: callers own runtime validation of the shape
		// (the trend route trusts responseMimeType:"application/json" + the
		// agent's schema prompt). A generic `as T` can't be a type guard.
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- generic JSON boundary; shape is validated by the calling agent
		return JSON.parse(text) as T;
	} catch {
		throw new Error(
			`Model did not return valid JSON. Got: ${raw.slice(0, 200)}${
				raw.length > 200 ? "…" : ""
			}`,
		);
	}
}
