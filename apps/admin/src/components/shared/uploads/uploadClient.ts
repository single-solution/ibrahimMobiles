"use client";

/**
 * Shared client-side helpers for the upload components. Wraps the
 * `POST /api/uploads` and `POST /api/uploads/deletions` endpoints so
 * callers don't repeat the FormData / JSON shapes inline.
 */

import type { StoredImage } from "@store/shared";

import { encodeImageVariants } from "./imageEncoder";

export interface UploadImageOptions {
	file: File;
	altTextBase?: string;
	subjectKind?: string;
	subjectId?: string;
}

export interface UploadVideoResult {
	url: string;
	contentType: string;
	sizeBytes: number;
}

export interface UploadVideoOptions {
	file: File;
	subjectKind?: string;
	subjectId?: string;
}

async function postUpload(form: FormData): Promise<unknown> {
	const res = await fetch("/api/uploads", {
		method: "POST",
		body: form,
		credentials: "same-origin",
	});
	if (!res.ok) {
		let message = `Upload failed (${res.status})`;
		try {
			const body = (await res.json()) as { error?: string };
			if (body?.error) message = body.error;
		} catch {
			/* swallow JSON parse errors */
		}
		throw new Error(message);
	}
	return res.json();
}

export async function uploadImage(options: UploadImageOptions): Promise<StoredImage> {
	// Variants are encoded in the browser; the server
	// only validates + streams them to R2.
	const encoded = await encodeImageVariants(options.file);
	const form = new FormData();
	form.set("kind", "image");
	form.set("variant_thumb", encoded.variants.thumb, "thumb.webp");
	form.set("variant_card", encoded.variants.card, "card.webp");
	form.set("variant_detail", encoded.variants.detail, "detail.webp");
	form.set("variant_full", encoded.variants.full, "full.webp");
	form.set("blurDataURL", encoded.blurDataURL);
	form.set("width", String(encoded.width));
	form.set("height", String(encoded.height));
	form.set("altTextBase", options.altTextBase || options.file.name.replace(/\.[^.]+$/, ""));
	if (options.subjectKind) form.set("subjectKind", options.subjectKind);
	if (options.subjectId) form.set("subjectId", options.subjectId);
	return (await postUpload(form)) as StoredImage;
}

export async function uploadVideo(options: UploadVideoOptions): Promise<UploadVideoResult> {
	// Try direct presigned cloud upload first to bypass serverless payload limits
	try {
		const presignForm = new FormData();
		presignForm.set("kind", "presigned");
		presignForm.set("contentType", options.file.type || "video/mp4");
		if (options.subjectKind) presignForm.set("subjectKind", options.subjectKind);
		if (options.subjectId) presignForm.set("subjectId", options.subjectId);

		const presignedRes = (await postUpload(presignForm)) as { uploadUrl?: string; publicUrl?: string };
		if (presignedRes?.uploadUrl && presignedRes?.publicUrl) {
			const putRes = await fetch(presignedRes.uploadUrl, {
				method: "PUT",
				headers: { "Content-Type": options.file.type || "video/mp4" },
				body: options.file,
			});
			if (putRes.ok) {
				return {
					url: presignedRes.publicUrl,
					contentType: options.file.type || "video/mp4",
					sizeBytes: options.file.size,
				};
			}
		}
	} catch {
		// Fallback to standard server multipart upload
	}

	const form = new FormData();
	form.set("file", options.file);
	form.set("kind", "video");
	if (options.subjectKind) form.set("subjectKind", options.subjectKind);
	if (options.subjectId) form.set("subjectId", options.subjectId);
	return (await postUpload(form)) as UploadVideoResult;
}

export async function removeStoredUrls(urls: string[]): Promise<void> {
	if (urls.length === 0) return;
	try {
		await fetch("/api/uploads/deletions", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ urls }),
			credentials: "same-origin",
		});
	} catch {
		// Best-effort. Logging happens server-side.
	}
}

export function collectStoredImageUrls(image: StoredImage): string[] {
	return [image.variants.thumb, image.variants.card, image.variants.detail, image.variants.full];
}
