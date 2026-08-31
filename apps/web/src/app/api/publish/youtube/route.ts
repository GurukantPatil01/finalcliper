import { NextRequest, NextResponse } from "next/server";
import type { PublishResponse } from "../types";

export const maxDuration = 120;

export async function POST(request: NextRequest): Promise<NextResponse<PublishResponse>> {
	try {
		const formData = await request.formData();
		const videoFile = formData.get("video") as File | null;
		const title = (formData.get("title") as string | null) ?? "Untitled Video";
		const description = (formData.get("description") as string | null) ?? "";
		const privacyStatus = (formData.get("privacyStatus") as string | null) ?? "public";
		const isShort = formData.get("isShort") === "true";
		const tagsString = formData.get("tags") as string | null;
		const customToken = formData.get("accessToken") as string | null;

		const accessToken = customToken || process.env.YOUTUBE_ACCESS_TOKEN;

		if (!videoFile) {
			return NextResponse.json(
				{
					success: false,
					platform: "youtube",
					error: "No video file provided for YouTube upload.",
				},
				{ status: 400 },
			);
		}

		if (!accessToken) {
			return NextResponse.json(
				{
					success: false,
					platform: "youtube",
					error:
						"YouTube OAuth Access Token is not configured. Please connect your Google/YouTube account or set YOUTUBE_ACCESS_TOKEN in environment variables.",
				},
				{ status: 400 },
			);
		}

		const tags = tagsString
			? tagsString.split(",").map((t) => t.trim()).filter(Boolean)
			: [];
		if (isShort && !tags.includes("#Shorts") && !tags.includes("Shorts")) {
			tags.push("Shorts");
		}

		const formattedDescription =
			isShort && !description.includes("#Shorts")
				? `${description}\n\n#Shorts`.trim()
				: description;

		const metadata = {
			snippet: {
				title: isShort && !title.includes("#Shorts") ? `${title} #Shorts` : title,
				description: formattedDescription,
				tags,
				categoryId: "22", // People & Blogs default
			},
			status: {
				privacyStatus,
				selfDeclaredMadeForKids: false,
			},
		};

		// Build multipart/related payload for YouTube Data API v3
		const boundary = `-------314159265358979323846`;
		const delimiter = `\r\n--${boundary}\r\n`;
		const closeDelimiter = `\r\n--${boundary}--`;

		const videoBuffer = await videoFile.arrayBuffer();
		const metadataHeader =
			delimiter +
			"Content-Type: application/json; charset=UTF-8\r\n\r\n" +
			JSON.stringify(metadata) +
			delimiter +
			`Content-Type: ${videoFile.type || "video/mp4"}\r\n\r\n`;

		const encoder = new TextEncoder();
		const headerBytes = encoder.encode(metadataHeader);
		const footerBytes = encoder.encode(closeDelimiter);

		const combinedBuffer = new Uint8Array(
			headerBytes.length + videoBuffer.byteLength + footerBytes.length,
		);
		combinedBuffer.set(headerBytes, 0);
		combinedBuffer.set(new Uint8Array(videoBuffer), headerBytes.length);
		combinedBuffer.set(footerBytes, headerBytes.length + videoBuffer.byteLength);

		const uploadRes = await fetch(
			"https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": `multipart/related; boundary=${boundary}`,
					"Content-Length": combinedBuffer.byteLength.toString(),
				},
				body: combinedBuffer,
			},
		);

		const uploadData = await uploadRes.json();

		if (!uploadRes.ok || !uploadData.id) {
			const errorMsg =
				uploadData?.error?.message ||
				uploadData?.error?.errors?.[0]?.message ||
				"Failed to upload video to YouTube.";
			return NextResponse.json(
				{
					success: false,
					platform: "youtube",
					error: errorMsg,
				},
				{ status: uploadRes.status || 500 },
			);
		}

		const videoId = uploadData.id as string;
		const postUrl = isShort
			? `https://www.youtube.com/shorts/${videoId}`
			: `https://www.youtube.com/watch?v=${videoId}`;

		return NextResponse.json({
			success: true,
			platform: "youtube",
			postId: videoId,
			postUrl,
			statusMessage: `Successfully uploaded to YouTube ${isShort ? "Shorts" : "Video"}!`,
		});
	} catch (error) {
		console.error("YouTube publish handler failed:", error);
		return NextResponse.json(
			{
				success: false,
				platform: "youtube",
				error: error instanceof Error ? error.message : "Internal YouTube upload error",
			},
			{ status: 500 },
		);
	}
}
