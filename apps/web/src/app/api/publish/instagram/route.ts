import { NextRequest, NextResponse } from "next/server";
import type { PublishResponse } from "../types";
import {
	createReelContainer,
	uploadVideoBytesToUri,
	waitForContainerProcessing,
	publishReelContainer,
	fetchMediaPermalink,
	InstagramTokenError,
	InstagramPermissionError,
	InstagramPublishError,
} from "@/analytics/graph-client";
import { extractIgToken } from "@/app/api/instagram/_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // 2 minutes max execution for video upload/processing

export async function POST(request: NextRequest): Promise<NextResponse<PublishResponse>> {
	try {
		const formData = await request.formData();
		const videoFile = formData.get("video") as File | null;
		const caption = (formData.get("caption") as string | null) ?? "";
		const shareToFeed = formData.get("shareToFeed") === "true";
		const customToken = formData.get("accessToken") as string | null;
		const customAccountId = formData.get("accountId") as string | null;

		const headerToken = extractIgToken(request);
		const accessToken = customToken || headerToken || process.env.INSTAGRAM_ACCESS_TOKEN;
		const userId = customAccountId || process.env.INSTAGRAM_ACCOUNT_ID;

		if (!videoFile) {
			return NextResponse.json(
				{
					success: false,
					platform: "instagram",
					error: "No video file provided for publishing.",
					errorCode: "missing_video_file",
				},
				{ status: 400 },
			);
		}

		if (!accessToken || !userId) {
			return NextResponse.json(
				{
					success: false,
					platform: "instagram",
					error: "Instagram is not connected. Connect your Instagram account to publish reels.",
					errorCode: "instagram_not_connected",
				},
				{ status: 400 },
			);
		}

		// Step A: Create upload container on graph.instagram.com
		let containerId: string;
		let uploadUri: string;
		try {
			const container = await createReelContainer({
				accessToken,
				userId,
				caption,
				shareToFeed,
			});
			containerId = container.containerId;
			uploadUri = container.uploadUri;
		} catch (error) {
			if (error instanceof InstagramTokenError) throw error;
			if (error instanceof InstagramPermissionError) throw error;
			const msg = error instanceof Error ? error.message : "Failed to create Instagram upload container.";
			return NextResponse.json(
				{
					success: false,
					platform: "instagram",
					error: msg,
					errorCode: "instagram_media_creation_failed",
				},
				{ status: 502 },
			);
		}

		// Step B: Upload video binary bytes to the resumable upload URI
		const videoBuffer = await videoFile.arrayBuffer();
		try {
			await uploadVideoBytesToUri({
				uploadUri,
				accessToken,
				videoBuffer,
			});
		} catch (error) {
			if (error instanceof InstagramTokenError) throw error;
			const msg = error instanceof Error ? error.message : "Binary video transfer to Instagram failed.";
			return NextResponse.json(
				{
					success: false,
					platform: "instagram",
					error: msg,
					errorCode: "instagram_media_upload_failed",
				},
				{ status: 502 },
			);
		}

		// Step C: Poll container status until FINISHED
		try {
			await waitForContainerProcessing({
				containerId,
				accessToken,
				maxAttempts: 30,
				delayMs: 2000,
			});
		} catch (error) {
			if (error instanceof InstagramTokenError) throw error;
			const msg = error instanceof Error ? error.message : "Video processing failed on Instagram servers.";
			return NextResponse.json(
				{
					success: false,
					platform: "instagram",
					error: msg,
					errorCode: "instagram_media_processing_failed",
				},
				{ status: 504 },
			);
		}

		// Step D: Publish the processed media container
		let postId: string;
		try {
			const published = await publishReelContainer({
				accessToken,
				userId,
				containerId,
			});
			postId = published.postId;
		} catch (error) {
			if (error instanceof InstagramTokenError) throw error;
			if (error instanceof InstagramPermissionError) throw error;
			const msg = error instanceof Error ? error.message : "Failed to publish media container to Instagram.";
			return NextResponse.json(
				{
					success: false,
					platform: "instagram",
					error: msg,
					errorCode: "instagram_publish_failed",
				},
				{ status: 502 },
			);
		}

		// Step E: Retrieve permalink (best-effort)
		const permalink = await fetchMediaPermalink(accessToken, postId);
		const postUrl = permalink || `https://www.instagram.com/p/${postId}`;

		return NextResponse.json({
			success: true,
			platform: "instagram",
			postId,
			postUrl,
			statusMessage: "Successfully published to Instagram Reels!",
		});
	} catch (error) {
		if (error instanceof InstagramPermissionError) {
			return NextResponse.json(
				{
					success: false,
					platform: "instagram",
					error: "Reconnect Instagram to enable publishing (missing publishing permission).",
					errorCode: "instagram_permission_missing",
				},
				{ status: 403 },
			);
		}

		if (error instanceof InstagramTokenError) {
			return NextResponse.json(
				{
					success: false,
					platform: "instagram",
					error: "Instagram access token expired or revoked. Please reconnect your account.",
					errorCode: "instagram_token_expired",
				},
				{ status: 401 },
			);
		}

		if (error instanceof InstagramPublishError) {
			return NextResponse.json(
				{
					success: false,
					platform: "instagram",
					error: error.message,
					errorCode: "instagram_publish_failed",
				},
				{ status: 502 },
			);
		}

		return NextResponse.json(
			{
				success: false,
				platform: "instagram",
				error: error instanceof Error ? error.message : "Internal Instagram publishing error",
				errorCode: "instagram_publish_failed",
			},
			{ status: 500 },
		);
	}
}
