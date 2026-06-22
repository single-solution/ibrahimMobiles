/**
 * Allowlist for storage object URLs that may be deleted via admin APIs.
 * Prevents callers from passing arbitrary third-party URLs to `remove()`.
 */

const VERCEL_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export function isAllowedStorageObjectUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "https:") {
			return false;
		}
		const host = parsed.hostname.toLowerCase();
		return host.endsWith(VERCEL_BLOB_HOST_SUFFIX);
	} catch {
		return false;
	}
}
