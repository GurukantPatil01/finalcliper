import {
	getCompositorCanvas,
	getLastFrameProfile,
	initCompositor,
	initializeGpu,
	releaseTexture,
	renderFrame,
	resizeCompositor,
	uploadTexture,
} from "opencut-wasm";
import {
	incrementCounter,
	isRenderPerfEnabled,
	recordWasmFrameProfile,
} from "@/diagnostics/render-perf";
import type {
	ExternalTextureDescriptor,
	FrameDescriptor,
	RenderedTextureDescriptor,
	TextureUploadDescriptor,
} from "./types";

let gpuInitPromise: Promise<boolean> | null = null;

export function ensureGpuInitialized(): Promise<boolean> {
	if (!gpuInitPromise) {
		if (typeof window === "undefined") {
			return Promise.resolve(false);
		}
		gpuInitPromise = initializeGpu()
			.then(() => true)
			.catch((error: unknown) => {
				console.warn(
					`GPU renderer unavailable: ${error instanceof Error ? error.message : String(error)}`,
				);
				return false;
			});
	}
	return gpuInitPromise;
}

if (typeof window !== "undefined") {
	void ensureGpuInitialized();
}

/**
 * One slot in the derived-texture cache. The OffscreenCanvas is persistent —
 * we reuse and redraw into it across frames, which is the change that takes
 * the WebGL upload path off the per-frame critical path for static content.
 */
type RenderedCacheEntry = {
	kind: "rendered";
	canvas: OffscreenCanvas;
	contentHash: string;
	width: number;
	height: number;
};

type ExternalCacheEntry = {
	kind: "external";
	source: CanvasImageSource;
	width: number;
	height: number;
};

class WasmCompositor {
	private canvas: HTMLCanvasElement | null = null;
	private initializedSize: { width: number; height: number } | null = null;
	private isWasmInitialized = false;
	private cache = new Map<string, RenderedCacheEntry | ExternalCacheEntry>();

	ensureInitialized({ width, height }: { width: number; height: number }) {
		if (!this.isWasmInitialized) {
			try {
				initCompositor(width, height);
				this.canvas = getCompositorCanvas();
				this.initializedSize = { width, height };
				this.isWasmInitialized = true;
			} catch (error) {
				console.warn(
					"Failed to initialize WASM compositor; falling back to 2D canvas:",
					error instanceof Error ? error.message : String(error),
				);
				if (!this.canvas && typeof document !== "undefined") {
					this.canvas = document.createElement("canvas");
					this.canvas.width = width;
					this.canvas.height = height;
					this.initializedSize = { width, height };
				}
			}
			return;
		}

		if (
			!this.initializedSize ||
			this.initializedSize.width !== width ||
			this.initializedSize.height !== height
		) {
			try {
				resizeCompositor(width, height);
			} catch {
				if (this.canvas) {
					this.canvas.width = width;
					this.canvas.height = height;
				}
			}
			this.initializedSize = { width, height };
		}
	}

	getCanvas(): HTMLCanvasElement {
		if (!this.canvas) {
			if (typeof document !== "undefined") {
				this.canvas = document.createElement("canvas");
			} else {
				throw new Error("Compositor is not initialized");
			}
		}
		return this.canvas;
	}

	syncTextures(textures: TextureUploadDescriptor[]) {
		try {
			const nextIds = new Set(textures.map((texture) => texture.id));
			for (const previousId of this.cache.keys()) {
				if (!nextIds.has(previousId)) {
					releaseTexture(previousId);
					this.cache.delete(previousId);
				}
			}

			for (const texture of textures) {
				if (texture.kind === "external") {
					this.syncExternalTexture(texture);
				} else {
					this.syncRenderedTexture(texture);
				}
			}
		} catch (error) {
			console.warn("WASM compositor texture sync failed:", error);
		}
	}

	render(frame: FrameDescriptor) {
		try {
			renderFrame(frame);
			if (isRenderPerfEnabled()) {
				recordWasmFrameProfile(
					getLastFrameProfile() as Array<{ name: string; durationMs: number }>,
				);
			}
		} catch (error) {
			console.warn("WASM compositor render failed:", error);
		}
	}

	private syncExternalTexture(texture: ExternalTextureDescriptor) {
		const isStaticImage =
			(typeof ImageBitmap !== "undefined" &&
				texture.source instanceof ImageBitmap) ||
			(typeof HTMLImageElement !== "undefined" &&
				texture.source instanceof HTMLImageElement);
		const previous = this.cache.get(texture.id);
		if (
			isStaticImage &&
			previous?.kind === "external" &&
			previous.source === texture.source &&
			previous.width === texture.width &&
			previous.height === texture.height
		) {
			incrementCounter({ name: "textureCacheHit" });
			return;
		}

		incrementCounter({ name: "textureUpload" });
		incrementCounter({
			name: "textureUploadPixels",
			by: texture.width * texture.height,
		});
		uploadTexture({
			id: texture.id,
			source: ensureOffscreenCanvas({
				source: texture.source,
				width: texture.width,
				height: texture.height,
				label: `texture upload ${texture.id}`,
			}),
			width: texture.width,
			height: texture.height,
		});
		this.cache.set(texture.id, {
			kind: "external",
			source: texture.source,
			width: texture.width,
			height: texture.height,
		});
	}

	private syncRenderedTexture(texture: RenderedTextureDescriptor) {
		const previous = this.cache.get(texture.id);
		if (
			previous?.kind === "rendered" &&
			previous.contentHash === texture.contentHash &&
			previous.width === texture.width &&
			previous.height === texture.height
		) {
			incrementCounter({ name: "textureCacheHit" });
			return;
		}

		const canvas =
			previous?.kind === "rendered" &&
			previous.width === texture.width &&
			previous.height === texture.height
				? previous.canvas
				: createBackingCanvas({
						width: texture.width,
						height: texture.height,
					});

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error(`Failed to get 2d context for texture ${texture.id}`);
		}
		ctx.clearRect(0, 0, texture.width, texture.height);
		texture.draw(ctx);

		incrementCounter({ name: "textureUpload" });
		incrementCounter({
			name: "textureUploadPixels",
			by: texture.width * texture.height,
		});
		uploadTexture({
			id: texture.id,
			source: canvas,
			width: texture.width,
			height: texture.height,
		});
		this.cache.set(texture.id, {
			kind: "rendered",
			canvas,
			contentHash: texture.contentHash,
			width: texture.width,
			height: texture.height,
		});
	}
}

export const wasmCompositor = new WasmCompositor();

function createBackingCanvas({
	width,
	height,
}: {
	width: number;
	height: number;
}): OffscreenCanvas {
	if (typeof OffscreenCanvas === "undefined") {
		throw new Error("OffscreenCanvas is not supported in this environment");
	}
	return new OffscreenCanvas(width, height);
}

function ensureOffscreenCanvas({
	source,
	width,
	height,
	label,
}: {
	source: CanvasImageSource;
	width: number;
	height: number;
	label: string;
}): OffscreenCanvas {
	if (source instanceof OffscreenCanvas) {
		return source;
	}

	if (typeof OffscreenCanvas === "undefined") {
		throw new Error(`OffscreenCanvas is required for ${label}`);
	}

	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error(`Failed to get 2d context for ${label}`);
	}
	context.clearRect(0, 0, width, height);
	context.drawImage(source, 0, 0, width, height);
	return canvas;
}
