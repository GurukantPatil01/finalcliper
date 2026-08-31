import { getGenAI } from "../client/genai";
import { MODELS } from "../client/models";
import { parseModelJson } from "../client/json";
import type { AnalysisReport, ChannelDiagnostic, ProductionDirective } from "./types";
import type { YouTubeDataPack } from "@/analytics/youtube-types";
import type { DataPack as InstagramDataPack } from "@/analytics/types";

const SYSTEM_INSTRUCTION = `You are the Lead Channel Performance & Growth Analysis Agent for short-form & long-form video creators.
Your mission is to autonomously reverse-engineer empirical audience behavior from raw channel metrics, diagnose what drove watch-time retention vs drop-offs, and generate a concrete, ready-to-produce next video production blueprint.

Analyze the data with high precision:
- Focus on Average View Percentage (AVP), retention drop-offs, and engagement rates.
- Identify the exact topic angles and hook archetypes that won vs failed.
- Synthesize actionable production directives for the downstream script writer and video editor.
- Always output STRICT valid JSON with the exact requested schema.`;

interface AnalyzeParams {
	youtubeData?: YouTubeDataPack;
	instagramData?: InstagramDataPack;
	apiKey?: string;
}

function buildAnalysisPrompt({
	youtubeData,
	instagramData,
}: {
	youtubeData?: YouTubeDataPack;
	instagramData?: InstagramDataPack;
}): string {
	let context = "RAW PERFORMANCE DATA:\n";

	if (youtubeData) {
		context += `\n[YOUTUBE CHANNEL: ${youtubeData.channel.title}]\n`;
		context += `- Subscribers: ${youtubeData.channel.subscriberCount}, 7d Delta: ${youtubeData.channel.subscriberDelta7d ?? "N/A"}\n`;
		context += `- 7-Day Views: ${youtubeData.rolling.viewsGained7d ?? youtubeData.latestDay.totals.views}, Estimated Watch Time: ${((youtubeData.rolling.watchTimeMinutes7d ?? youtubeData.latestDay.totals.estimatedMinutesWatched) / 60).toFixed(1)} hrs\n`;
		context += `- Shorts vs Long-Form: Shorts Avg Views: ${youtubeData.insights.shortsVsLongForm.shortsAvgViews}, Long-form Avg Views: ${youtubeData.insights.shortsVsLongForm.longFormAvgViews}\n`;
		context += `- Top Performing Videos:\n${youtubeData.insights.topPerformingVideos
			.map(
				(v) =>
					`  * "${v.video.title}" (${v.video.isShort ? "Short" : "Long"}) — ${v.video.views} views, ${v.video.likes} likes, Retention: ${v.retentionPct.toFixed(1)}%`,
			)
			.join("\n")}\n`;
		if (youtubeData.insights.underPerformingVideos?.length) {
			context += `- Underperforming Videos:\n${youtubeData.insights.underPerformingVideos
				.map(
					(v) =>
						`  * "${v.video.title}" — ${v.video.views} views, ${v.video.likes} likes`,
				)
				.join("\n")}\n`;
		}
	}

	if (instagramData) {
		context += `\n[INSTAGRAM ACCOUNT: @${instagramData.account.username || "creator"}]\n`;
		context += `- Followers: ${instagramData.account.followersCount ?? "N/A"}, 7d Delta: ${instagramData.account.followersDelta7d ?? "N/A"}\n`;
		context += `- 7d Views: ${instagramData.rolling.viewsGained7d ?? "N/A"}, 7d Engagement Rate: ${instagramData.rolling.engagementRate7d != null ? (instagramData.rolling.engagementRate7d * 100).toFixed(2) : "N/A"}%\n`;
		context += `- Top Reels:\n${instagramData.topReels
			.map(
				(r) =>
					`  * "${r.reel.caption?.slice(0, 60) || "Reel"}" — ${r.reel.views} views, ${r.reel.likes} likes, ${r.engagementRate != null ? (r.engagementRate * 100).toFixed(1) : "0"}% eng`,
			)
			.join("\n")}\n`;
		if (instagramData.patterns?.topCaptionKeywords?.length) {
			context += `- Top Caption Keywords: ${instagramData.patterns.topCaptionKeywords.map((k) => `${k.word} (${k.count})`).join(", ")}\n`;
		}
	}

	return `${context}

Perform a rigorous diagnostic and return a JSON object with EXACTLY this structure:
{
  "platform": "${youtubeData && instagramData ? "unified" : youtubeData ? "youtube" : "instagram"}",
  "channelName": "${youtubeData?.channel.title || instagramData?.account.username || "Creator"}",
  "analyzedAt": "${new Date().toISOString()}",
  "diagnostic": {
    "status": "strong_growth" | "steady" | "needs_recalibration" | "initial_stage",
    "summary": string,                    // 2 sentences on current channel trajectory
    "topStrength": string,                // What is the #1 competitive advantage right now
    "criticalDropoffReason": string,      // Why underperforming videos dropped off
    "retentionScorePct": number,          // Estimated overall retention health (0-100)
    "engagementBenchmark": string         // "Above average" | "Healthy" | "Below average"
  },
  "keyLearnings": {
    "whatWorked": string[],               // 3-4 concrete elements that drove results
    "whatFailed": string[],               // 2-3 mistakes to eliminate in future edits
    "bestPostTiming": string              // Optimal posting window
  },
  "nextVideoBlueprint": {
    "title": string,                      // High-CTR title for the next video
    "hookStrategy": string,               // Exact 3-second opening hook structure
    "targetDurationSeconds": number,      // Recommended length (e.g. 25-45s)
    "concept": string,                    // Core viral narrative premise
    "visualStyle": string,                // Specific visual aesthetic & pacing style
    "pacing": string,                     // e.g. "Fast cuts every 1.5s with text punch-ins"
    "keywords": string[]                  // 4-6 target keywords
  },
  "actionItems": string[]                 // 3-5 prioritized production actions
}`;
}

/**
 * Execute the Google GenAI SDK (ADK2) Analysis Agent.
 */
export async function runAnalysisAgent({
	youtubeData,
	instagramData,
	apiKey,
}: AnalyzeParams): Promise<AnalysisReport> {
	if (!youtubeData && !instagramData) {
		throw new Error("At least one platform data pack (YouTube or Instagram) is required.");
	}

	const ai = getGenAI(apiKey);

	const prompt = buildAnalysisPrompt({ youtubeData, instagramData });

	const response = await ai.models.generateContent({
		model: MODELS.text,
		contents: prompt,
		config: {
			systemInstruction: SYSTEM_INSTRUCTION,
			responseMimeType: "application/json",
			temperature: 0.4,
		},
	});

	const report = parseModelJson<AnalysisReport>(response.text);
	return report;
}
