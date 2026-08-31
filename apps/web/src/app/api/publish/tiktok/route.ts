import { NextRequest, NextResponse } from "next/server";
import type { PublishResponse } from "../types";

export const maxDuration = 120;

export async function POST(request: NextRequest): Promise<NextResponse<PublishResponse>> {
	try {
		const formData = await request.formData();
		const videoFile = formData.get("video") as File | null;
		const title = (formData.get("title") as string | null) ?? "";
		const privacyLevel = (formData.get("privacyLevel") as string | null) ?? "PUBLIC_TO_EVERYONE";
		const disableDuet = formData.get("disableDuet") === "true";
		const disableComment = formData.get("disableComment") === "true";
		const disableStitch = formData.get("disableStitch") === "true";
		const customToken = formData.get("accessToken") as string | null;

		const accessToken = customToken || process.env.TIKTOK_ACCESS_TOKEN;

		if (!videoFile) {
			return NextResponse.json(
				{
					success: false,
					platform: "tiktok",
					error: "No video file provided for TikTok upload.",
				},
				{ status: 400 },
			);
		}

		if (!accessToken) {
			return NextResponse.json(
				{
					success: false,
					platform: "tiktok",
					error:
						"TikTok Access Token is not configured. Please connect your TikTok account or set TIKTOK_ACCESS_TOKEN in environment variables.",
				},
				{ status: 400 },
			);
		}

		const videoBuffer = await videoFile.arrayBuffer();

		// Step 1: Initialize Video Post on TikTok Content Posting API
		const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json; charset=UTF-8",
			},
			body: JSON.stringify({
				post_info: {
					title,
					privacy_level: privacyLevel,
					disable_duet: disableDuet,
					disable_comment: disableComment,
					disable_stitch: disableStitch,
					video_cover_timestamp_ms: 1000,
				},
				source_info: {
					source: "FILE_UPLOAD",
					video_size: videoBuffer.byteLength,
					chunk_size: videoBuffer.byteLength,
					total_chunk_count: 1,
				},
			}),
		});

		const initData = await initRes.json();

		if (!initRes.ok || initData?.error?.code !== "ok" || !initData?.data?.upload_url) {
			const errorMsg =
				initData?.error?.message ||
				initData?.message ||
				"Failed to initialize video upload on TikTok.";
			return NextResponse.json(
				{
					success: false,
					platform: "tiktok",
					error: errorMsg,
				},
				{ status: initRes.status || 500 },
			);
		}

		const uploadUrl = initData.data.upload_url as string;
		const publishId = initData.data.publish_id as string;

		// Step 2: Upload Video binary to TikTok Upload URL
		const uploadRes = await fetch(uploadUrl, {
			method: "PUT",
			headers: {
				"Content-Range": `bytes 0-${videoBuffer.byteLength - 1}/${videoBuffer.byteLength}`,
				"Content-Type": "video/mp4",
				"Content-Length": videoBuffer.byteLength.toString(),
			},
			body: videoBuffer,
		});

		if (!uploadRes.ok) {
			return NextResponse.json(
				{
					success: false,
					platform: "tiktok",
					error: `Failed to upload video content to TikTok servers: HTTP ${uploadRes.status}`,
				},
				{ status: uploadRes.status || 500 },
			);
		}

		return NextResponse.json({
			success: true,
			platform: "tiktok",
			postId: publishId,
			statusMessage: "Successfully submitted video to TikTok for processing and publication!",
		});
	} catch (error) {
		console.error("TikTok publish handler failed:", error);
		return NextResponse.json(
			{
				success: false,
				platform: "tiktok",
				error: error instanceof Error ? error.message : "Internal TikTok publish error",
			},
			{ status: 500 },
		);
	}
}
