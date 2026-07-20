/**
 * Server-side variant storage for the upload route.
 *
 * The browser (`imageEncoder.ts`) already produced the WebP variant ladder +
 * blur placeholder — this module only validates the finished artefacts (magic
 * bytes, size caps) and streams each to the active `StorageProvider` (R2/S3).
 * No image CPU runs here — variants arrive pre-encoded from the browser.
 *
 * Failure handling: if any variant put fails, best-effort `remove` the ones
 * that already succeeded so we don't leak orphans into storage.
 */

import { assertContentTypeMatches, logger, SNIFF_BYTE_COUNT, type StorageProvider, type StoredImage } from "@store/shared";

import { MAX_VARIANT_BYTES, type ImageVariantName } from "./limits";

const VARIANT_ORDER: ImageVariantName[] = ["thumb", "card", "detail", "full"];
const BLUR_DATA_URL_PREFIX = "data:image/webp;base64,";
const MAX_BLUR_DATA_URL_LENGTH = 4_000;

export class UploadValidationError extends Error {
	status: number;
	constructor(message: string, status = 400) {
		super(message);
		this.name = "UploadValidationError";
		this.status = status;
	}
}

export interface StoreImageInput {
	variants: Record<ImageVariantName, Buffer>;
	blurDataURL: string;
	/** Source dimensions reported by the browser encoder. */
	width: number;
	height: number;
	alt: string;
	/** Provider-relative key prefix, e.g. `products/<id>/2026-07-20`. */
	keyPrefix: string;
	storage: StorageProvider;
}

/** Short random suffix that keeps generated object keys unique. */
function shortId(): string {
	return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function storeImage(input: StoreImageInput): Promise<StoredImage> {
	const { variants, blurDataURL, width, height, alt, keyPrefix, storage } = input;

	if (!blurDataURL.startsWith(BLUR_DATA_URL_PREFIX) || blurDataURL.length > MAX_BLUR_DATA_URL_LENGTH) {
		throw new UploadValidationError("Invalid blur placeholder.", 400);
	}
	if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
		throw new UploadValidationError("Invalid image dimensions.", 400);
	}

	const stored = { thumb: "", card: "", detail: "", full: "" } as Record<ImageVariantName, string>;
	const persisted: string[] = [];
	try {
		for (const name of VARIANT_ORDER) {
			const buffer = variants[name];
			if (!buffer || buffer.length === 0) {
				throw new UploadValidationError(`Missing "${name}" image variant.`, 400);
			}
			if (buffer.length > MAX_VARIANT_BYTES) {
				throw new UploadValidationError(`"${name}" variant is too large.`, 413);
			}
			const sniffError = assertContentTypeMatches(buffer.subarray(0, SNIFF_BYTE_COUNT), "image/webp");
			if (sniffError) {
				throw new UploadValidationError(sniffError, 415);
			}
			const key = `${keyPrefix}/${name}-${shortId()}.webp`;
			const url = await storage.put(key, buffer, "image/webp");
			stored[name] = url;
			persisted.push(url);
		}

		return {
			variants: stored,
			blurDataURL,
			width: Math.trunc(width),
			height: Math.trunc(height),
			alt,
		};
	} catch (error) {
		await Promise.allSettled(
			persisted.map((url) =>
				storage.remove(url).catch((removeError) => {
					logger.warn({ error: removeError, url }, "storeImage: cleanup remove() failed");
				}),
			),
		);
		throw error;
	}
}
