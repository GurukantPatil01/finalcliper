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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	loadUserApiKeys,
	saveUserApiKeys,
	clearUserApiKeys,
	type UserApiKeys,
} from "@/services/api-keys/storage";
import {
	Key,
	Eye,
	EyeOff,
	Sparkles,
	Share2,
	CheckCircle2,
	AlertCircle,
	ExternalLink,
	Trash2,
	Save,
	Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
	getInstagramConnection,
	pickupInstagramOAuthHandoff,
	subscribeToInstagramConnection,
} from "@/services/instagram/connection";
import {
	getYouTubeConnection,
	pickupYouTubeOAuthHandoff,
	subscribeToYouTubeConnection,
} from "@/services/youtube/connection";

interface ApiKeysModalProps {
	isOpen: boolean;
	onClose: () => void;
	defaultTab?: "ai" | "social";
}

export function ApiKeysModal({
	isOpen,
	onClose,
	defaultTab = "ai",
}: ApiKeysModalProps) {
	const [activeTab, setActiveTab] = useState<"ai" | "social">(defaultTab);
	const [keys, setKeys] = useState<UserApiKeys>({});
	const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
	const [isTestingAi, setIsTestingAi] = useState(false);
	const [aiTestStatus, setAiTestStatus] = useState<"idle" | "success" | "error">("idle");
	const [aiTestError, setAiTestError] = useState("");

	useEffect(() => {
		if (isOpen) {
			void Promise.all([
				pickupInstagramOAuthHandoff(),
				pickupYouTubeOAuthHandoff(),
			]).then(() => {
				const loaded = loadUserApiKeys();
				setKeys(loaded);
			});
			const loaded = loadUserApiKeys();
			setKeys(loaded);
			setAiTestStatus("idle");
			setAiTestError("");
		}
	}, [isOpen]);

	useEffect(() => {
		const unsubIg = subscribeToInstagramConnection((conn) => {
			setKeys((prev) => ({
				...prev,
				instagramConnection: conn || undefined,
			}));
		});
		const unsubYt = subscribeToYouTubeConnection((conn) => {
			setKeys((prev) => ({
				...prev,
				youtubeConnection: conn || undefined,
			}));
		});
		return () => {
			unsubIg();
			unsubYt();
		};
	}, []);

	const toggleShow = (fieldName: string) => {
		setShowKeys((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
	};

	const handleChange = (field: keyof UserApiKeys, value: string) => {
		setKeys((prev) => ({ ...prev, [field]: value }));
		setAiTestStatus("idle");
	};

	const handleSave = () => {
		saveUserApiKeys(keys);
		toast.success("API keys saved locally in your browser.");
		onClose();
	};

	const handleClearAll = () => {
		if (confirm("Are you sure you want to remove all saved API keys?")) {
			clearUserApiKeys();
			setKeys({});
			toast.info("All local API keys cleared.");
		}
	};

	const testGeminiKey = async () => {
		const keyToTest = keys.geminiApiKey?.trim();
		if (!keyToTest) {
			toast.error("Please enter a Gemini API Key to test.");
			return;
		}

		setIsTestingAi(true);
		setAiTestStatus("idle");
		setAiTestError("");

		try {
			const res = await fetch("/api/ai/trend", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-gemini-api-key": keyToTest,
				},
				body: JSON.stringify({ niche: "quick-test" }),
			});

			const data = await res.json().catch(() => null);

			if (res.ok && data?.report) {
				setAiTestStatus("success");
				toast.success("Gemini API key verified successfully!");
			} else {
				setAiTestStatus("error");
				const errorMsg = data?.message || `HTTP ${res.status}: Failed to authenticate key.`;
				setAiTestError(errorMsg);
				toast.error("API key validation failed.");
			}
		} catch (error) {
			setAiTestStatus("error");
			setAiTestError(error instanceof Error ? error.message : "Connection failed.");
			toast.error("Connection failed.");
		} finally {
			setIsTestingAi(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[580px] bg-background">
				<DialogHeader>
					<div className="flex items-center gap-2.5">
						<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<Key className="size-4.5" />
						</div>
						<div>
							<DialogTitle className="text-base font-semibold">
								API Keys & Integrations (BYOK)
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">
								Add your own API keys to enable AI generation and direct social publishing.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-4 pt-1">
					<Tabs
						value={activeTab}
						onValueChange={(val) => setActiveTab(val as "ai" | "social")}
					>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="ai" className="text-xs gap-1.5">
								<Sparkles className="size-3.5 text-primary" />
								AI Studio (Gemini & Veo)
							</TabsTrigger>
							<TabsTrigger value="social" className="text-xs gap-1.5">
								<Share2 className="size-3.5 text-sky-500" />
								Social Media (Instagram, YouTube, TikTok)
							</TabsTrigger>
						</TabsList>

						{/* AI STUDIO TAB */}
						<TabsContent value="ai" className="space-y-3.5 pt-3">
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label className="text-xs font-medium flex items-center gap-1.5">
										Google Gemini & Veo API Key
										{keys.geminiApiKey?.trim() ? (
											<Badge variant="outline" className="text-[10px] py-0 border-emerald-500/40 text-emerald-500">
												Configured
											</Badge>
										) : (
											<Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
												Missing
											</Badge>
										)}
									</Label>
									<a
										href="https://aistudio.google.com/app/apikey"
										target="_blank"
										rel="noreferrer"
										className="text-[11px] text-primary hover:underline flex items-center gap-1"
									>
										Get a free key
										<ExternalLink className="size-3" />
									</a>
								</div>

								<div className="relative flex items-center">
									<Input
										type={showKeys.gemini ? "text" : "password"}
										placeholder="AIzaSy..."
										value={keys.geminiApiKey || ""}
										onChange={(e) => handleChange("geminiApiKey", e.target.value)}
										className="pr-16 text-xs h-9"
									/>
									<div className="absolute right-1 flex items-center">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-7 w-7 p-0 text-muted-foreground"
											onClick={() => toggleShow("gemini")}
										>
											{showKeys.gemini ? (
												<EyeOff className="size-3.5" />
											) : (
												<Eye className="size-3.5" />
											)}
										</Button>
									</div>
								</div>
								<p className="text-[11px] text-muted-foreground leading-relaxed">
									Used for viral trend research, scene scriptwriting, AI voiceover, and Veo video generation.
								</p>
							</div>

							{aiTestStatus === "success" && (
								<div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
									<CheckCircle2 className="size-4 shrink-0" />
									<span>Key is valid and active on Google AI Studio!</span>
								</div>
							)}

							{aiTestStatus === "error" && (
								<div className="flex items-start gap-2 p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs">
									<AlertCircle className="size-4 shrink-0 mt-0.5" />
									<div className="space-y-0.5">
										<div className="font-semibold">Validation Failed</div>
										<div>{aiTestError}</div>
									</div>
								</div>
							)}

							<div className="flex items-center justify-between pt-1">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="text-xs h-8 gap-1.5"
									onClick={testGeminiKey}
									disabled={isTestingAi || !keys.geminiApiKey?.trim()}
								>
									{isTestingAi ? (
										<>
											<Loader2 className="size-3.5 animate-spin" />
											Verifying...
										</>
									) : (
										<>
											<CheckCircle2 className="size-3.5 text-primary" />
											Test Key Connection
										</>
									)}
								</Button>
							</div>
						</TabsContent>

						{/* SOCIAL MEDIA TAB */}
						<TabsContent value="social" className="space-y-3.5 pt-3">
							{/* Instagram */}
							<div className="space-y-2 p-2.5 rounded-lg border bg-muted/20">
								<div className="flex items-center justify-between">
									<Label className="text-xs font-semibold">Instagram (Unified Connection)</Label>
									<a
										href="https://developers.facebook.com/docs/instagram-platform/instagram-graph-api"
										target="_blank"
										rel="noreferrer"
										className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
									>
										Docs
										<ExternalLink className="size-2.5" />
									</a>
								</div>
								{keys.instagramConnection?.accessToken ? (
									<div className="flex items-center justify-between p-2 rounded-md bg-background border">
										<div className="flex items-center gap-2">
											<CheckCircle2 className="size-4 text-emerald-500" />
											<span className="text-xs font-medium">
												Connected{keys.instagramConnection.username ? ` as @${keys.instagramConnection.username}` : ` (ID: ${keys.instagramConnection.userId})`}
											</span>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-7 text-xs text-muted-foreground hover:text-destructive"
											onClick={() => {
												clearUserApiKeys();
												setKeys((prev) => ({
													...prev,
													instagramConnection: undefined,
													instagramAccessToken: undefined,
													instagramAccountId: undefined,
												}));
												toast.success("Instagram disconnected");
											}}
										>
											Disconnect
										</Button>
									</div>
								) : (
									<div className="flex items-center justify-between p-2 rounded-md bg-background border border-dashed">
										<span className="text-xs text-muted-foreground">Not connected</span>
										<Button size="sm" className="h-7 text-xs" asChild>
											<a href="/api/instagram/oauth/start?returnTo=/">
												Connect Instagram
											</a>
										</Button>
									</div>
								)}
								<p className="text-[10px] text-muted-foreground">
									One-time OAuth connection used for both Reels publishing and analytics.
								</p>
							</div>

							{/* YouTube */}
							<div className="space-y-2 p-2.5 rounded-lg border bg-muted/20">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1.5">
										<Label className="text-xs font-semibold">YouTube</Label>
										{keys.youtubeConnection ? (
											<Badge variant="secondary" className="text-[10px] h-4 px-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
												Connected
											</Badge>
										) : null}
									</div>
									<a
										href="https://developers.google.com/youtube/v3/getting-started"
										target="_blank"
										rel="noreferrer"
										className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
									>
										Docs
										<ExternalLink className="size-2.5" />
									</a>
								</div>

								{keys.youtubeConnection ? (
									<div className="flex items-center justify-between p-2 rounded-md bg-background border">
										<div className="flex items-center gap-2">
											<CheckCircle2 className="size-3.5 text-emerald-500" />
											<span className="text-xs font-medium truncate max-w-[200px]">
												Connected as {keys.youtubeConnection.channelTitle}
											</span>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-7 text-xs text-muted-foreground hover:text-destructive"
											onClick={() => {
												setKeys((prev) => ({
													...prev,
													youtubeConnection: undefined,
													youtubeAccessToken: undefined,
												}));
												toast.success("YouTube disconnected");
											}}
										>
											Disconnect
										</Button>
									</div>
								) : (
									<div className="flex items-center justify-between p-2 rounded-md bg-background border border-dashed">
										<span className="text-xs text-muted-foreground">Not connected</span>
										<Button size="sm" className="h-7 text-xs" asChild>
											<a href="/api/youtube/oauth/start?returnTo=/">
												Connect YouTube
											</a>
										</Button>
									</div>
								)}
								<p className="text-[10px] text-muted-foreground">
									Google OAuth connection used for video publishing and YouTube Studio analytics.
								</p>
							</div>

							{/* TikTok */}
							<div className="space-y-2 p-2.5 rounded-lg border bg-muted/20">
								<div className="flex items-center justify-between">
									<Label className="text-xs font-semibold">TikTok (Posting API)</Label>
									<a
										href="https://developers.tiktok.com/doc/content-posting-api-get-started"
										target="_blank"
										rel="noreferrer"
										className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
									>
										Docs
										<ExternalLink className="size-2.5" />
									</a>
								</div>
								<div className="space-y-1">
									<Label className="text-[11px] text-muted-foreground">Access Token</Label>
									<Input
										type="password"
										placeholder="act.example..."
										value={keys.tiktokAccessToken || ""}
										onChange={(e) => handleChange("tiktokAccessToken", e.target.value)}
										className="h-8 text-xs"
									/>
								</div>
							</div>
						</TabsContent>
					</Tabs>

					<div className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground leading-relaxed">
						🔒 <strong>Privacy Note:</strong> Your API keys are stored solely in your local browser storage and are never uploaded to third-party databases.
					</div>

					<div className="flex items-center justify-between pt-2 border-t">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={handleClearAll}
							className="text-destructive hover:bg-destructive/10 text-xs h-8 gap-1.5"
						>
							<Trash2 className="size-3.5" />
							Clear Keys
						</Button>

						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
								Cancel
							</Button>
							<Button size="sm" onClick={handleSave} className="text-xs h-8 gap-1.5">
								<Save className="size-3.5" />
								Save Keys
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export function ApiKeysButton({
	className = "h-8 gap-1.5 px-2.5 text-xs",
}: {
	className?: string;
}) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={() => setIsOpen(true)}
				className={className}
				title="API Keys & Integrations"
			>
				<Key className="size-3.5 text-primary" />
				<span className="hidden sm:inline">API Keys</span>
			</Button>
			<ApiKeysModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
		</>
	);
}
