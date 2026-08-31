export type PlatformType = "instagram" | "youtube" | "tiktok" | "web_share";

export type InstagramMediaType = "REELS" | "FEED" | "STORIES";

export type VideoVisibility = "public" | "private" | "unlisted";

export interface InstagramPublishOptions {
	caption: string;
	mediaType: InstagramMediaType;
	shareToFeed?: boolean;
	coverUrl?: string;
	accessToken?: string;
	accountId?: string;
}

export interface YouTubePublishOptions {
	title: string;
	description: string;
	tags?: string[];
	categoryId?: string;
	privacyStatus: VideoVisibility;
	isShort?: boolean;
	accessToken?: string;
}

export interface TikTokPublishOptions {
	title: string;
	privacyLevel: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";
	disableDuet?: boolean;
	disableComment?: boolean;
	disableStitch?: boolean;
	accessToken?: string;
}

export interface PublishRequestPayload {
	platform: PlatformType;
	videoName: string;
	options: {
		instagram?: InstagramPublishOptions;
		youtube?: YouTubePublishOptions;
		tiktok?: TikTokPublishOptions;
	};
}

export interface PublishResponse {
	success: boolean;
	platform: PlatformType;
	postId?: string;
	postUrl?: string;
	statusMessage?: string;
	error?: string;
	errorCode?: string;
}
