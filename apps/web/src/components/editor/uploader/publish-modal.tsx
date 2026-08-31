"use client";

import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEditor } from "@/editor/use-editor";
import { platformPublisher } from "@/services/uploader/platform-publisher";
import {
	loadSavedCredentials,
	saveCredentials,
	type PlatformCredentials,
} from "@/services/uploader/settings-storage";
import { loadUserApiKeys } from "@/services/api-keys/storage";
import {
	getInstagramConnection,
	clearInstagramConnection,
	pickupInstagramOAuthHandoff,
	subscribeToInstagramConnection,
	isInstagramConnected,
	type InstagramConnection,
} from "@/services/instagram/connection";
import {
	pickupYouTubeOAuthHandoff,
	subscribeToYouTubeConnection,
} from "@/services/youtube/connection";
import type { PlatformType, PublishResponse } from "@/app/api/publish/types";
import {
	CheckCircle2,
	ExternalLink,
	Key,
	Loader2,
	Share2,
	Upload,
	Video,
	Copy,
	Check,
	RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface PublishModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function PublishModal({ isOpen, onClose }: PublishModalProps) {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const exportState = useEditor((e) => e.project.getExportState());

	const [activePlatform, setActivePlatform] = useState<PlatformType>("instagram");
	const [credentials, setCredentials] = useState<PlatformCredentials>({});
	const [showCreds, setShowCreds] = useState(false);

	// Instagram Connection State
	const [igConnection, setIgConnection] = useState<InstagramConnection | null>(null);

	// Instagram Form State
	const [igCaption, setIgCaption] = useState("");
	const [igMediaType, setIgMediaType] = useState<"REELS" | "FEED">("REELS");
	const [igShareToFeed, setIgShareToFeed] = useState(true);

	// YouTube Form State
	const [ytTitle, setYtTitle] = useState("");
	const [ytDescription, setYtDescription] = useState("");
	const [ytTags, setYtTags] = useState("");
	const [ytPrivacy, setYtPrivacy] = useState<"public" | "unlisted" | "private">("public");
	const [ytToken, setYtToken] = useState("");

	// TikTok Form State
	const [ttTitle, setTtTitle] = useState("");
	const [ttPrivacy, setTtPrivacy] = useState<
		"PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY"
	>("PUBLIC_TO_EVERYONE");
	const [ttDisableComment, setTtDisableComment] = useState(false);
	const [ttDisableDuet, setTtDisableDuet] = useState(false);
	const [ttDisableStitch, setTtDisableStitch] = useState(false);
	const [ttToken, setTtToken] = useState("");

	// Publishing Flow Status State
	const [isPublishing, setIsPublishing] = useState(false);
	const [currentPhase, setCurrentPhase] = useState<"idle" | "exporting" | "uploading" | "published" | "error">("idle");
	const [statusMessage, setStatusMessage] = useState("");
	const [publishResult, setPublishResult] = useState<PublishResponse | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (isOpen) {
			void Promise.all([
				pickupInstagramOAuthHandoff(),
				pickupYouTubeOAuthHandoff(),
			]).then(([igConn, ytConn]) => {
				setIgConnection(igConn || getInstagramConnection());
			});
			const saved = loadSavedCredentials();
			const userKeys = loadUserApiKeys();
			setCredentials(saved);
			setYtToken(
				saved.youtube?.accessToken ||
					userKeys.youtubeConnection?.accessToken ||
					userKeys.youtubeAccessToken ||
					"",
			);
			setTtToken(saved.tiktok?.accessToken || userKeys.tiktokAccessToken || "");

			if (activeProject) {
				const name = activeProject.metadata.name || "My Project";
				setYtTitle(name);
				setTtTitle(name);
				setIgCaption(`${name} #viral #reels`);
			}
			setCurrentPhase("idle");
			setPublishResult(null);
		}
	}, [isOpen, activeProject]);

	useEffect(() => {
		const unsubIg = subscribeToInstagramConnection((conn) => {
			setIgConnection(conn);
		});
		const unsubYt = subscribeToYouTubeConnection((conn) => {
			if (conn?.accessToken) {
				setYtToken(conn.accessToken);
			}
		});
		return () => {
			unsubIg();
			unsubYt();
		};
	}, []);

	const saveCurrentCredentials = () => {
		const updated: PlatformCredentials = {
			youtube: {
				accessToken: ytToken.trim() || undefined,
			},
			tiktok: {
				accessToken: ttToken.trim() || undefined,
			},
		};
		setCredentials(updated);
		saveCredentials(updated);
	};

	const addHashtag = (tag: string) => {
		if (activePlatform === "instagram") {
			setIgCaption((prev) => (prev ? `${prev} ${tag}` : tag));
		} else if (activePlatform === "youtube") {
			setYtDescription((prev) => (prev ? `${prev} ${tag}` : tag));
		} else if (activePlatform === "tiktok") {
			setTtTitle((prev) => (prev ? `${prev} ${tag}` : tag));
		}
	};

	const handlePublish = async () => {
		if (!activeProject) return;

		if (activePlatform === "instagram" && !isInstagramConnected()) {
			toast.error("Please connect your Instagram account to publish.", {
				description: "Click 'Connect Instagram' above to link your Professional account.",
			});
			return;
		}

		if (activePlatform === "youtube" && !ytToken.trim()) {
			setShowCreds(true);
			toast.error("Please enter your YouTube OAuth Access Token to publish.");
			return;
		}

		if (activePlatform === "tiktok" && !ttToken.trim()) {
			setShowCreds(true);
			toast.error("Please enter your TikTok Access Token to publish.");
			return;
		}

		saveCurrentCredentials();
		setIsPublishing(true);
		setCurrentPhase("exporting");
		setStatusMessage("Rendering high-quality video from timeline…");

		try {
			// Step 1: Render and export video buffer
			const exportResult = await editor.project.export({
				options: {
					format: "mp4",
					quality: "high",
					fps: activeProject.settings.fps,
					includeAudio: true,
				},
			});

			if (exportResult.cancelled || !exportResult.success || !exportResult.buffer) {
				setIsPublishing(false);
				setCurrentPhase("idle");
				if (exportResult.error) {
					toast.error(`Video render failed: ${exportResult.error}`);
				}
				return;
			}

			const videoBlob = new Blob([exportResult.buffer], { type: "video/mp4" });
			const videoFile = new File(
				[videoBlob],
				`${activeProject.metadata.name || "video"}.mp4`,
				{ type: "video/mp4" },
			);

			// Step 2: Upload to selected platform
			setCurrentPhase("uploading");

			let result: PublishResponse;

			if (activePlatform === "instagram") {
				setStatusMessage("Uploading and processing Instagram Reel…");
				result = await platformPublisher.publishToInstagram({
					videoFile,
					options: {
						caption: igCaption,
						mediaType: igMediaType,
						shareToFeed: igShareToFeed,
					},
				});
			} else if (activePlatform === "youtube") {
				setStatusMessage("Uploading to YouTube…");
				const isVertical =
					activeProject.settings.canvasSize.height >
					activeProject.settings.canvasSize.width;
				result = await platformPublisher.publishToYouTube({
					videoFile,
					options: {
						title: ytTitle || activeProject.metadata.name,
						description: ytDescription,
						tags: ytTags ? ytTags.split(",") : undefined,
						privacyStatus: ytPrivacy,
						isShort: isVertical,
						accessToken: ytToken.trim() || undefined,
					},
				});
			} else if (activePlatform === "tiktok") {
				setStatusMessage("Submitting video to TikTok…");
				result = await platformPublisher.publishToTikTok({
					videoFile,
					options: {
						title: ttTitle,
						privacyLevel: ttPrivacy,
						disableComment: ttDisableComment,
						disableDuet: ttDisableDuet,
						disableStitch: ttDisableStitch,
						accessToken: ttToken.trim() || undefined,
					},
				});
			} else {
				setStatusMessage("Opening system share sheet…");
				result = await platformPublisher.shareViaNativeSheet({
					videoFile,
					title: activeProject.metadata.name,
					text: igCaption,
				});
			}

			setPublishResult(result);

			if (result.success) {
				setCurrentPhase("published");
				toast.success(result.statusMessage || "Published successfully!");
			} else {
				setCurrentPhase("error");
				toast.error(result.error || "Failed to publish video");
			}
		} catch (error) {
			console.error("Publishing workflow error:", error);
			setCurrentPhase("error");
			setPublishResult({
				success: false,
				platform: activePlatform,
				error: error instanceof Error ? error.message : "Unexpected publishing failure.",
			});
			toast.error("Publishing failed.");
		} finally {
			setIsPublishing(false);
		}
	};

	const copyLink = async (url: string) => {
		await navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
		toast.success("Post link copied to clipboard!");
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[560px] bg-background">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<Upload className="size-4" />
						</div>
						<div>
							<DialogTitle className="text-base font-semibold">
								Publish & Upload Video
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">
								Directly upload your video to Instagram, YouTube, TikTok or share to apps.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				{currentPhase === "exporting" || currentPhase === "uploading" ? (
					<div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
						<div className="relative flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary animate-pulse">
							<Loader2 className="size-7 animate-spin" />
						</div>
						<div className="space-y-1">
							<div className="text-sm font-semibold">{statusMessage}</div>
							<div className="text-xs text-muted-foreground">
								{currentPhase === "exporting"
									? `Rendering: ${Math.round(exportState.progress * 100)}% complete`
									: "Uploading to platform..."}
							</div>
						</div>
						{currentPhase === "exporting" && (
							<div className="w-full max-w-xs">
								<Progress value={exportState.progress * 100} />
							</div>
						)}
					</div>
				) : currentPhase === "published" && publishResult ? (
					<div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
						<div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
							<CheckCircle2 className="size-6" />
						</div>
						<div className="space-y-1">
							<div className="text-sm font-semibold">Video Published Successfully!</div>
							<p className="text-xs text-muted-foreground max-w-sm">
								{publishResult.statusMessage || "Your video is live on the selected platform."}
							</p>
						</div>

						{publishResult.postUrl && (
							<div className="flex items-center gap-2 w-full max-w-sm p-2 rounded-lg border bg-muted/40">
								<Input
									readOnly
									value={publishResult.postUrl}
									className="h-8 text-xs bg-transparent border-0 focus-visible:ring-0"
								/>
								<Button
									size="sm"
									variant="outline"
									className="h-7 px-2 text-xs"
									onClick={() => copyLink(publishResult.postUrl!)}
								>
									{copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
								</Button>
								<Button
									size="sm"
									className="h-7 px-2 text-xs"
									asChild
								>
									<a href={publishResult.postUrl} target="_blank" rel="noreferrer">
										<ExternalLink className="size-3.5" />
									</a>
								</Button>
							</div>
						)}

						<div className="flex gap-2 mt-2">
							<Button variant="outline" size="sm" onClick={() => setCurrentPhase("idle")}>
								Upload Another
							</Button>
							<Button size="sm" onClick={onClose}>
								Done
							</Button>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						<Tabs
							value={activePlatform}
							onValueChange={(val) => setActivePlatform(val as PlatformType)}
						>
							<TabsList className="grid w-full grid-cols-4">
								<TabsTrigger value="instagram" className="text-xs">
									Instagram
								</TabsTrigger>
								<TabsTrigger value="youtube" className="text-xs">
									YouTube
								</TabsTrigger>
								<TabsTrigger value="tiktok" className="text-xs">
									TikTok
								</TabsTrigger>
								<TabsTrigger value="web_share" className="text-xs">
									Quick Share
								</TabsTrigger>
							</TabsList>

							{/* INSTAGRAM TAB */}
							<TabsContent value="instagram" className="space-y-3 pt-2">
								{igConnection ? (
									<div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
										<div className="flex items-center gap-2">
											<div className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
												<CheckCircle2 className="size-4" />
											</div>
											<div>
												<div className="text-xs font-semibold">
													Connected as {igConnection.username ? `@${igConnection.username}` : `Account ID: ${igConnection.userId}`}
												</div>
												<div className="text-[10px] text-muted-foreground">
													Unified connection for Reels publishing & analytics
												</div>
											</div>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-7 text-xs text-muted-foreground hover:text-destructive"
											onClick={() => {
												clearInstagramConnection();
												setIgConnection(null);
												toast.success("Instagram disconnected");
											}}
										>
											Disconnect
										</Button>
									</div>
								) : (
									<div className="p-3 rounded-lg border border-dashed bg-muted/10 space-y-2">
										<div className="flex items-center justify-between gap-2">
											<div className="space-y-0.5">
												<div className="text-xs font-semibold">Instagram Not Connected</div>
												<p className="text-[11px] text-muted-foreground">
													Connect your Instagram Professional account once to publish Reels directly.
												</p>
											</div>
											<Button
												type="button"
												size="sm"
												className="h-8 text-xs gap-1.5 shrink-0"
												asChild
											>
												<a href="/api/instagram/oauth/start?returnTo=/">
													Connect Instagram
												</a>
											</Button>
										</div>
									</div>
								)}

								<div className="space-y-1.5">
									<Label className="text-xs font-medium">Caption</Label>
									<Textarea
										placeholder="Write a caption with hashtags..."
										rows={3}
										value={igCaption}
										onChange={(e) => setIgCaption(e.target.value)}
										className="text-xs"
									/>
									<div className="flex flex-wrap gap-1 mt-1">
										{["#trending", "#viral", "#reels", "#fyp", "#contentcreator"].map((tag) => (
											<button
												key={tag}
												type="button"
												onClick={() => addHashtag(tag)}
												className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-muted text-muted-foreground transition-colors"
											>
												{tag}
											</button>
										))}
									</div>
								</div>

								<div className="grid grid-cols-2 gap-3 pt-1">
									<div className="space-y-1.5">
										<Label className="text-xs font-medium">Format</Label>
										<Select
											value={igMediaType}
											onValueChange={(val) => setIgMediaType(val as "REELS" | "FEED")}
										>
											<SelectTrigger className="h-8 text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="REELS">Reels (9:16)</SelectItem>
												<SelectItem value="FEED">Feed Video</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="flex items-center justify-between pt-5">
										<Label htmlFor="share-feed" className="text-xs cursor-pointer">
											Share to Feed
										</Label>
										<Switch
											id="share-feed"
											checked={igShareToFeed}
											onCheckedChange={setIgShareToFeed}
										/>
									</div>
								</div>
							</TabsContent>

							{/* YOUTUBE TAB */}
							<TabsContent value="youtube" className="space-y-3 pt-2">
								<div className="space-y-1.5">
									<Label className="text-xs font-medium">Title</Label>
									<Input
										placeholder="Video title"
										value={ytTitle}
										onChange={(e) => setYtTitle(e.target.value)}
										className="h-8 text-xs"
									/>
								</div>

								<div className="space-y-1.5">
									<Label className="text-xs font-medium">Description</Label>
									<Textarea
										placeholder="Video description..."
										rows={2}
										value={ytDescription}
										onChange={(e) => setYtDescription(e.target.value)}
										className="text-xs"
									/>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-1.5">
										<Label className="text-xs font-medium">Tags (comma separated)</Label>
										<Input
											placeholder="shorts, editing, tech"
											value={ytTags}
											onChange={(e) => setYtTags(e.target.value)}
											className="h-8 text-xs"
										/>
									</div>
									<div className="space-y-1.5">
										<Label className="text-xs font-medium">Visibility</Label>
										<Select
											value={ytPrivacy}
											onValueChange={(val) => setYtPrivacy(val as "public" | "unlisted" | "private")}
										>
											<SelectTrigger className="h-8 text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="public">Public</SelectItem>
												<SelectItem value="unlisted">Unlisted</SelectItem>
												<SelectItem value="private">Private</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</TabsContent>

							{/* TIKTOK TAB */}
							<TabsContent value="tiktok" className="space-y-3 pt-2">
								<div className="space-y-1.5">
									<Label className="text-xs font-medium">Title / Caption</Label>
									<Textarea
										placeholder="TikTok video caption #fyp..."
										rows={3}
										value={ttTitle}
										onChange={(e) => setTtTitle(e.target.value)}
										className="text-xs"
									/>
								</div>

								<div className="space-y-1.5">
									<Label className="text-xs font-medium">Who can watch this video</Label>
									<Select
										value={ttPrivacy}
										onValueChange={(val) =>
											setTtPrivacy(
												val as "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY",
											)
										}
									>
										<SelectTrigger className="h-8 text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="PUBLIC_TO_EVERYONE">Everyone (Public)</SelectItem>
											<SelectItem value="MUTUAL_FOLLOW_FRIENDS">Friends</SelectItem>
											<SelectItem value="SELF_ONLY">Only Me (Private)</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</TabsContent>

							{/* QUICK SHARE TAB */}
							<TabsContent value="web_share" className="space-y-4 pt-2">
								<div className="rounded-lg border p-3 bg-muted/20 space-y-2">
									<div className="flex items-center gap-2 text-xs font-semibold">
										<Share2 className="size-4 text-primary" />
										Native Device Share
									</div>
									<p className="text-xs text-muted-foreground leading-relaxed">
										Directly share this video to Instagram, TikTok, WhatsApp, AirDrop, or other apps installed on your device without needing API keys.
									</p>
								</div>
							</TabsContent>
						</Tabs>

						{/* API Credentials Drawer for YouTube & TikTok */}
						{(activePlatform === "youtube" || activePlatform === "tiktok") && (
							<div className="border rounded-lg p-2.5 bg-muted/10 space-y-2">
								<button
									type="button"
									onClick={() => setShowCreds(!showCreds)}
									className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
								>
									<span className="flex items-center gap-1.5">
										<Key className="size-3.5" />
										Platform API Credentials
									</span>
									<span className="text-[11px] underline">
										{showCreds ? "Hide" : "Configure"}
									</span>
								</button>

								{showCreds && (
									<div className="space-y-2 pt-2 border-t">
										{activePlatform === "youtube" && (
											<div className="space-y-1">
												<Label className="text-[11px]">YouTube OAuth Access Token</Label>
												<Input
													type="password"
													placeholder="ya29..."
													value={ytToken}
													onChange={(e) => setYtToken(e.target.value)}
													className="h-7 text-xs"
												/>
											</div>
										)}

										{activePlatform === "tiktok" && (
											<div className="space-y-1">
												<Label className="text-[11px]">TikTok Access Token</Label>
												<Input
													type="password"
													placeholder="act.example..."
													value={ttToken}
													onChange={(e) => setTtToken(e.target.value)}
													className="h-7 text-xs"
												/>
											</div>
										)}

										<p className="text-[10px] text-muted-foreground pt-1">
											Credentials are saved locally in your browser storage.
										</p>
									</div>
								)}
							</div>
						)}

						{currentPhase === "error" && publishResult?.error && (
							<div className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-2">
								<div className="font-medium">Publishing Error</div>
								<div>{publishResult.error}</div>
								{(publishResult.errorCode === "instagram_permission_missing" ||
									publishResult.errorCode === "instagram_token_expired" ||
									publishResult.errorCode === "instagram_not_connected") && (
									<Button
										size="sm"
										variant="outline"
										className="h-7 text-xs border-destructive/40 hover:bg-destructive/10 text-destructive"
										asChild
									>
										<a href="/api/instagram/oauth/start?returnTo=/">
											Reconnect Instagram
										</a>
									</Button>
								)}
							</div>
						)}

						<div className="flex justify-end gap-2 pt-2 border-t">
							<Button variant="outline" size="sm" onClick={onClose} disabled={isPublishing}>
								Cancel
							</Button>
							<Button size="sm" onClick={handlePublish} disabled={isPublishing} className="gap-1.5">
								{activePlatform === "web_share" ? (
									<>
										<Share2 className="size-3.5" />
										Share Video
									</>
								) : (
									<>
										<Upload className="size-3.5" />
										Publish to {activePlatform === "instagram" ? "Instagram" : activePlatform === "youtube" ? "YouTube" : "TikTok"}
									</>
								)}
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

export function PublishButton() {
	const [isOpen, setIsOpen] = useState(false);
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const hasProject = !!activeProject;

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setIsOpen(true)}
				disabled={!hasProject}
				className="h-8 gap-1.5 px-3 text-xs font-medium border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-foreground shadow-xs"
			>
				<Upload className="size-3.5 text-primary" />
				<span>Publish</span>
			</Button>
			<PublishModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
		</>
	);
}
