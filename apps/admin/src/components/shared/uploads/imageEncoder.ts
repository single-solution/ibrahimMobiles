"use client";

/**
 * Browser-side image variant encoder.
 *
 * Replaces server `sharp` processing (which can't run on Cloudflare Workers):
 * decodes the source once, then renders the same WebP variant ladder
 * (thumb/card/detail/full) + a tiny blur placeholder using a canvas. The
 * finished variants are uploaded to the Worker, which only validates and
 * streams them to R2 — no server image CPU.
 *
 * Output matches the server `StoredImage` contract exactly, so the storefront
 * renderers and `next/image` slots are unchanged.
 */

import { BLURHASH_DIMENSION, IMAGE_VARIANT_WIDTHS, WEBP_QUALITY, type ImageVariantName } from "@/lib/uploads/limits";

const WEBP_QUALITY_RATIO = WEBP_QUALITY / 100;
const BLUR_QUALITY_RATIO = 0.4;
const VARIANT_ORDER: ImageVariantName[] = ["thumb", "card", "detail", "full"];

export interface EncodedImage {
	variants: Record<ImageVariantName, Blob>;
	blurDataURL: string;
	/** Source (pre-resize) dimensions — used by `next/image` to reserve space. */
	width: number;
	height: number;
}

interface TargetSize {
	width: number;
	height: number;
	/** Center-crop to a square (thumb) instead of fitting to width. */
	cover: boolean;
}

function targetSize(name: ImageVariantName, sourceWidth: number, sourceHeight: number): TargetSize {
	const maxWidth = IMAGE_VARIANT_WIDTHS[name];
	if (name === "thumb") {
		// Square, never upscaled beyond the shorter source axis.
		const side = Math.min(maxWidth, sourceWidth, sourceHeight);
		return { width: side, height: side, cover: true };
	}
	const width = Math.min(maxWidth, sourceWidth);
	const scale = width / sourceWidth;
	return { width, height: Math.max(1, Math.round(sourceHeight * scale)), cover: false };
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image encoding failed"))), "image/webp", quality);
	});
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error ?? new Error("Blur read failed"));
		reader.readAsDataURL(blob);
	});
}

function drawTo(bitmap: ImageBitmap, size: TargetSize): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = size.width;
	canvas.height = size.height;
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Canvas 2D context unavailable");
	}
	if (size.cover) {
		const side = Math.min(bitmap.width, bitmap.height);
		const sourceX = (bitmap.width - side) / 2;
		const sourceY = (bitmap.height - side) / 2;
		context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, size.width, size.height);
	} else {
		context.drawImage(bitmap, 0, 0, size.width, size.height);
	}
	return canvas;
}

export async function encodeImageVariants(file: File): Promise<EncodedImage> {
	const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
	try {
		const sourceWidth = bitmap.width;
		const sourceHeight = bitmap.height;
		if (!sourceWidth || !sourceHeight) {
			throw new Error("Unable to read image dimensions.");
		}

		const variants = {} as Record<ImageVariantName, Blob>;
		for (const name of VARIANT_ORDER) {
			const canvas = drawTo(bitmap, targetSize(name, sourceWidth, sourceHeight));
			variants[name] = await canvasToWebp(canvas, WEBP_QUALITY_RATIO);
		}

		const blurSide = Math.min(BLURHASH_DIMENSION, sourceWidth, sourceHeight);
		const blurCanvas = drawTo(bitmap, { width: blurSide, height: blurSide, cover: true });
		const blurDataURL = await blobToDataUrl(await canvasToWebp(blurCanvas, BLUR_QUALITY_RATIO));

		return { variants, blurDataURL, width: sourceWidth, height: sourceHeight };
	} finally {
		bitmap.close();
	}
}
