import type {
	InstagramPublishOptions,
	PublishResponse,
	TikTokPublishOptions,
	YouTubePublishOptions,
} from "@/app/api/publish/types";
import {
	getInstagramConnection,
	refreshInstagramTokenIfNeeded,
} from "@/services/instagram/connection";

export class PlatformPublisherService {
	async publishToInstagram({
		videoFile,
		options,
	}: {
		videoFile: File;
		options: InstagramPublishOptions;
	}): Promise<PublishResponse> {
		// Ensure token is refreshed if <7 days remain
		const refreshedConn = await refreshInstagramTokenIfNeeded();
		const conn = refreshedConn || getInstagramConnection();

		const accessToken = options.accessToken || conn?.accessToken;
		const accountId = options.accountId || conn?.userId;

		if (!accessToken || !accountId) {
			return {
				success: false,
				platform: "instagram",
				error: "Instagram is not connected. Please connect your Instagram account first.",
				errorCode: "instagram_not_connected",
			};
		}

		const formData = new FormData();
		formData.append("video", videoFile, videoFile.name || "video.mp4");
		formData.append("caption", options.caption || "");
		formData.append("mediaType", options.mediaType || "REELS");
		formData.append("shareToFeed", options.shareToFeed ? "true" : "false");
		formData.append("accessToken", accessToken);
		formData.append("accountId", accountId);

		const response = await fetch("/api/publish/instagram", {
			method: "POST",
			headers: {
				"x-ig-token": accessToken,
			},
			body: formData,
		});

		const data: PublishResponse = await response.json().catch(() => ({
			success: false,
			platform: "instagram",
			error: `Server returned status ${response.status}`,
			errorCode: "instagram_publish_failed",
		}));

		return data;
	}

	async publishToYouTube({
		videoFile,
		options,
	}: {
		videoFile: File;
		options: YouTubePublishOptions;
	}): Promise<PublishResponse> {
		const formData = new FormData();
		formData.append("video", videoFile, videoFile.name || "video.mp4");
		formData.append("title", options.title || "My Video");
		formData.append("description", options.description || "");
		formData.append("privacyStatus", options.privacyStatus || "public");
		formData.append("isShort", options.isShort ? "true" : "false");
		if (options.tags?.length) {
			formData.append("tags", options.tags.join(","));
		}
		if (options.accessToken) formData.append("accessToken", options.accessToken);

		const response = await fetch("/api/publish/youtube", {
			method: "POST",
			body: formData,
		});

		const data: PublishResponse = await response.json().catch(() => ({
			success: false,
			platform: "youtube",
			error: `Server returned status ${response.status}`,
		}));

		return data;
	}

	async publishToTikTok({
		videoFile,
		options,
	}: {
		videoFile: File;
		options: TikTokPublishOptions;
	}): Promise<PublishResponse> {
		const formData = new FormData();
		formData.append("video", videoFile, videoFile.name || "video.mp4");
		formData.append("title", options.title || "");
		formData.append("privacyLevel", options.privacyLevel || "PUBLIC_TO_EVERYONE");
		formData.append("disableDuet", options.disableDuet ? "true" : "false");
		formData.append("disableComment", options.disableComment ? "true" : "false");
		formData.append("disableStitch", options.disableStitch ? "true" : "false");
		if (options.accessToken) formData.append("accessToken", options.accessToken);

		const response = await fetch("/api/publish/tiktok", {
			method: "POST",
			body: formData,
		});

		const data: PublishResponse = await response.json().catch(() => ({
			success: false,
			platform: "tiktok",
			error: `Server returned status ${response.status}`,
		}));

		return data;
	}

	canUseNativeShare(file?: File): boolean {
		if (typeof navigator === "undefined" || !navigator.share) {
			return false;
		}
		if (!file) return true;
		if (navigator.canShare) {
			return navigator.canShare({ files: [file] });
		}
		return true;
	}

	async shareViaNativeSheet({
		videoFile,
		title,
		text,
	}: {
		videoFile: File;
		title?: string;
		text?: string;
	}): Promise<PublishResponse> {
		if (!this.canUseNativeShare(videoFile)) {
			return {
				success: false,
				platform: "web_share",
				error: "Web Share API is not supported in this browser environment.",
			};
		}

		try {
			await navigator.share({
				title: title || "Video",
				text: text || "",
				files: [videoFile],
			});

			return {
				success: true,
				platform: "web_share",
				statusMessage: "Shared successfully via system share sheet!",
			};
		} catch (error) {
			if (error instanceof Error && error.name === "AbortError") {
				return {
					success: false,
					platform: "web_share",
					error: "Share sheet cancelled by user.",
				};
			}
			return {
				success: false,
				platform: "web_share",
				error: error instanceof Error ? error.message : "Web share failed",
			};
		}
	}
}

export const platformPublisher = new PlatformPublisherService();
