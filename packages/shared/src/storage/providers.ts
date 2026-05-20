/**
 * Storage provider abstraction.
 *
 * The admin upload pipeline (T2.2) writes WebP variants + an original
 * video file through a `StorageProvider`. We start on Vercel Blob today
 * (PLAN §1 — locked decision) and keep the seam tight so the future S3
 * migration only flips `STORAGE_PROVIDER=s3` and finishes filling in
 * `s3Provider.ts`. No consumer of `processImage()` needs to know which
 * backing store is live.
 *
 * Server-only: this module imports `@vercel/blob` lazily so importing
 * the shared package from a client bundle (e.g. for `StoredImage`
 * types) does not pull the SDK in.
 */

/**
 * Minimal contract every storage provider implements. `put` returns the
 * public HTTPS URL of the stored object; `remove` deletes by URL (so
 * callers don't have to remember the original key).
 */
export interface StorageProvider {
  /**
   * Persist `body` at `key` and return its publicly accessible HTTPS URL.
   *
   * - `key` is provider-relative ("products/abc/variants/def-1.webp").
   *   Providers may prefix internally but the returned URL must stay
   *   stable for the lifetime of the object.
   * - `contentType` is the MIME of the body (`image/webp`, `video/mp4`).
   */
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  /**
   * Best-effort delete by public URL. Implementations should swallow
   * "not found" errors so cleanup paths are idempotent.
   */
  remove(url: string): Promise<void>;
}

export type StorageProviderName = "vercel-blob" | "s3";

const DEFAULT_PROVIDER_NAME: StorageProviderName = "vercel-blob";

function readProviderName(): StorageProviderName {
  const raw = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (!raw) return DEFAULT_PROVIDER_NAME;
  if (raw === "vercel-blob" || raw === "s3") return raw;
  throw new Error(
    `Unsupported STORAGE_PROVIDER="${raw}". Expected one of: vercel-blob, s3.`,
  );
}

/**
 * Vercel Blob implementation. Imports the SDK lazily so client bundles
 * that import `@store/shared` for type-only purposes don't pull it in.
 */
const vercelBlobProvider: StorageProvider = {
  async put(key, body, contentType) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN is not set — cannot upload to Vercel Blob.",
      );
    }
    const { put } = await import("@vercel/blob");
    const result = await put(key, body, {
      access: "public",
      contentType,
      // The SDK appends a random suffix by default; we already pass a
      // nanoid in the key from `processImage`, so disable the second
      // randomisation to keep keys predictable for cleanup paths.
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return result.url;
  },
  async remove(url) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN is not set — cannot delete from Vercel Blob.",
      );
    }
    const { del } = await import("@vercel/blob");
    try {
      await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (error) {
      // "Not found" is a no-op from our perspective. Everything else
      // bubbles so callers can decide to retry or log.
      const message =
        error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("not found") || message.includes("does not exist")) {
        return;
      }
      throw error;
    }
  },
};

/**
 * Stub S3 provider. Throws on every call so a mis-set
 * `STORAGE_PROVIDER=s3` fails loud instead of silently dropping
 * uploads. The future S3 migration replaces these two function bodies
 * with `@aws-sdk/client-s3` calls — every consumer of `StorageProvider`
 * stays unchanged.
 */
const s3Provider: StorageProvider = {
  async put() {
    throw new Error(
      "S3 storage provider not yet implemented — set STORAGE_PROVIDER=vercel-blob.",
    );
  },
  async remove() {
    throw new Error(
      "S3 storage provider not yet implemented — set STORAGE_PROVIDER=vercel-blob.",
    );
  },
};

/**
 * Resolve the active provider from `STORAGE_PROVIDER` (defaults to
 * `vercel-blob`). Throws on unknown values rather than silently falling
 * back so configuration mistakes surface during the first upload.
 */
export function resolveStorageProvider(): StorageProvider {
  const name = readProviderName();
  switch (name) {
    case "vercel-blob":
      return vercelBlobProvider;
    case "s3":
      return s3Provider;
    default: {
      const exhaustive: never = name;
      throw new Error(`Unknown STORAGE_PROVIDER: ${String(exhaustive)}`);
    }
  }
}
