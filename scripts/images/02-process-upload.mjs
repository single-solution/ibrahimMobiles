/**
 * Step 2 — process every downloaded source image with `sharp` (4-variant
 * WebP ladder + base64 blur placeholder), push each variant to Vercel
 * Blob, then patch each product's `gradeImages` in MongoDB.
 *
 *   • Each source image is processed ONCE. The resulting `StoredImage`
 *     object is then reused across every grade in the product, just in
 *     a different order per grade so the gallery feels rich without
 *     paying for extra storage.
 *   • Per-grade ordering = rotation by grade index (Brand New keeps
 *     the canonical order; Open Box → shift by 1; Genuine Used → 2; …).
 *   • Resolves grades per-product from the live variants (no
 *     hard-coding) so accessories with only a handful of grades still
 *     fit, and the script is robust to future grade additions.
 *
 * Run with:   node scripts/images/02-process-upload.mjs
 * Optional:   --dry-run     (process + plan only; no upload, no DB write)
 *             --only=<slug> (limit to one product)
 *             --reset       (skip cleanup of previous blobs — fresh keys)
 *
 * Read-modify-write semantics. Safe to re-run; uses unique blob keys
 * each run, so previous run's blobs become orphans (cleaned by the
 * `gradeImages` overwrite when you delete the old document).
 */

import { createHash, randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, extname } from "node:path";

import sharp from "sharp";
import mongoose from "mongoose";
import { put as blobPut } from "@vercel/blob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const STAGING_DIR = join(ROOT, "tmp", "product-images");

// ── Pipeline constants (mirrors apps/admin/src/lib/uploads/limits.ts) ─
const IMAGE_VARIANT_WIDTHS = {
  thumb: 160,
  card: 480,
  detail: 1080,
  full: 2400,
};
const WEBP_QUALITY = 78;
const WEBP_EFFORT = 4;
const BLURHASH_DIMENSION = 32;

// ── CLI args ─────────────────────────────────────────────────────────
const argv = new Set(process.argv.slice(2));
const DRY_RUN = argv.has("--dry-run");
const ONLY = Array.from(argv)
  .find((a) => a.startsWith("--only="))
  ?.slice("--only=".length);

// ── Env loading ──────────────────────────────────────────────────────
function loadDotenvLocal() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  const txt = readFileSync(p, "utf8");
  for (const raw of txt.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}
loadDotenvLocal();

// MONGODB_URI is always required so dry-run can still read live grades.
// BLOB_READ_WRITE_TOKEN is only required when actually uploading.
if (!process.env.MONGODB_URI) {
  console.error("Missing required env var: MONGODB_URI");
  process.exit(1);
}
if (!DRY_RUN && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Missing required env var: BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────
function shortId(byteCount = 6) {
  return randomBytes(byteCount).toString("base64url");
}

function bytesToKb(n) {
  return `${Math.round(n / 1024)} KB`;
}

/**
 * Process a single source buffer through the 4-variant WebP ladder
 * plus a 32×32 base64 blur placeholder. Mirrors `processImage()` in
 * `apps/admin/src/lib/uploads/processImage.ts` but writes to Vercel
 * Blob directly using the official SDK.
 */
async function processOneImage({ buffer, keyPrefix, alt }) {
  if (!buffer || buffer.length === 0) {
    throw new Error("Empty image buffer");
  }
  const metadata = await sharp(buffer).metadata();
  const sourceWidth = metadata.width ?? 0;
  const sourceHeight = metadata.height ?? 0;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("Unable to read image dimensions");
  }

  const uploaded = []; // for rollback on failure
  try {
    const variants = await Promise.all(
      Object.entries(IMAGE_VARIANT_WIDTHS).map(async ([name, width]) => {
        const resize =
          name === "thumb"
            ? {
                width,
                height: width,
                fit: "cover",
                position: "centre",
                withoutEnlargement: true,
              }
            : { width, withoutEnlargement: true };
        const out = await sharp(buffer)
          .rotate()
          .resize(resize)
          .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
          .toBuffer();
        const key = `${keyPrefix}/${name}-${shortId()}.webp`;
        if (DRY_RUN) {
          return [name, `https://dry-run.local/${key}`];
        }
        const result = await blobPut(key, out, {
          access: "public",
          contentType: "image/webp",
          addRandomSuffix: false,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        uploaded.push(result.url);
        return [name, result.url];
      }),
    );

    const blurBuffer = await sharp(buffer)
      .rotate()
      .resize(BLURHASH_DIMENSION)
      .webp({ quality: 40 })
      .toBuffer();
    const blurDataURL = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

    return {
      variants: Object.fromEntries(variants),
      blurDataURL,
      width: sourceWidth,
      height: sourceHeight,
      alt,
    };
  } catch (error) {
    // Best-effort cleanup
    if (uploaded.length > 0 && !DRY_RUN) {
      const { del } = await import("@vercel/blob");
      await Promise.allSettled(
        uploaded.map((url) =>
          del(url, { token: process.env.BLOB_READ_WRITE_TOKEN }),
        ),
      );
    }
    throw error;
  }
}

/**
 * Each grade gets a "rotated" view of the same pool so the hero image
 * differs across grades. We rotate so the first item shifts forward
 * by `index` positions, but every image still appears. For pools
 * smaller than the desired count we just repeat the rotation cycle.
 */
function rotatePool(pool, shift) {
  if (pool.length === 0) return [];
  const n = pool.length;
  const s = ((shift % n) + n) % n;
  return [...pool.slice(s), ...pool.slice(0, s)];
}

/**
 * Stable hash of a source file. Used to dedupe across products that
 * happen to share an image (rare, but cheap to guard against).
 */
function hashBuffer(buf) {
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

// ── Main ─────────────────────────────────────────────────────────────
async function loadManifest() {
  const manifestPath = join(STAGING_DIR, "manifest.json");
  const raw = await readFile(manifestPath, "utf8");
  return JSON.parse(raw);
}

async function listImagesFor(slug) {
  const dir = join(STAGING_DIR, slug);
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort() // ensures 01-, 02-, … natural order
    .map((f) => join(dir, f));
}

async function main() {
  const manifest = await loadManifest();
  const allSlugs = ONLY ? [ONLY] : Object.keys(manifest);

  console.log(
    `\nProcessing ${allSlugs.length} product${allSlugs.length === 1 ? "" : "s"}` +
      (DRY_RUN ? " (DRY RUN — no uploads, no DB writes)" : "") +
      ".\n",
  );

  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.connection.collection("products");

  let totalProductsUpdated = 0;
  let totalImagesProcessed = 0;
  const failures = [];

  for (const slug of allSlugs) {
    const sourceFiles = await listImagesFor(slug);
    if (sourceFiles.length === 0) {
      console.warn(`! ${slug}: no source images found, skipping`);
      continue;
    }

    const liveDoc = await Product.findOne(
      { slug },
      { projection: { _id: 1, name: 1, "variants.gradeSlug": 1 } },
    );
    if (!liveDoc) {
      console.warn(`! ${slug}: not in MongoDB, skipping`);
      continue;
    }

    const productId = liveDoc._id.toString();
    const productName = liveDoc.name;
    const grades = Array.from(
      new Set((liveDoc.variants ?? []).map((v) => v.gradeSlug)),
    );

    if (grades.length === 0) {
      console.warn(`! ${slug}: no grades on variants, skipping`);
      continue;
    }

    console.log(
      `▸ ${slug}  →  ${sourceFiles.length} source image${sourceFiles.length === 1 ? "" : "s"}, ${grades.length} grade${grades.length === 1 ? "" : "s"}: [${grades.join(", ")}]`,
    );

    // 1. Process every source image once → upload all 4 variants → keep StoredImage.
    const pool = [];
    for (const filepath of sourceFiles) {
      const buf = await readFile(filepath);
      const hash = hashBuffer(buf);
      const keyPrefix = `products/${productId}/${hash}`;
      const alt = `${productName} — ${basename(filepath, extname(filepath))}`;
      try {
        const stored = await processOneImage({ buffer: buf, keyPrefix, alt });
        pool.push(stored);
        totalImagesProcessed += 1;
        console.log(
          `    ✓ processed  ${basename(filepath)}  (${stored.width}×${stored.height}, ${bytesToKb(buf.length)} → 4 webp variants)`,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`    ! failed   ${basename(filepath)}  → ${msg}`);
        failures.push({ slug, file: basename(filepath), error: msg });
      }
    }

    if (pool.length === 0) {
      console.warn(`! ${slug}: nothing processed, skipping DB patch`);
      continue;
    }

    // 2. Build per-grade galleries. Each grade gets the full pool but
    //    rotated so the hero shifts; the `alt` text is re-stamped with
    //    the grade label so the same StoredImage URL renders with a
    //    grade-aware alt across galleries.
    const gradeImages = grades.map((gradeSlug, idx) => {
      const rotated = rotatePool(pool, idx);
      return {
        gradeSlug,
        images: rotated.map((img, i) => ({
          variants: { ...img.variants },
          blurDataURL: img.blurDataURL,
          width: img.width,
          height: img.height,
          alt: `${productName} — ${gradeSlug.replace(/-/g, " ")} (${i + 1}/${rotated.length})`,
        })),
      };
    });

    console.log(
      `    → grade galleries: ${gradeImages
        .map((g) => `${g.gradeSlug}=${g.images.length}`)
        .join(", ")}`,
    );

    // 3. Patch MongoDB.
    if (!DRY_RUN) {
      const res = await Product.updateOne(
        { _id: liveDoc._id },
        { $set: { gradeImages, updatedAt: new Date() } },
      );
      if (res.modifiedCount === 1) {
        totalProductsUpdated += 1;
        console.log(`    ✓ patched gradeImages on ${slug}`);
      } else {
        console.warn(`    ! Mongo update reported modifiedCount=0 for ${slug}`);
      }
    }
  }

  await mongoose.disconnect();

  console.log(
    "\n" +
      "═".repeat(66) +
      "\n" +
      ` Summary` +
      "\n" +
      "═".repeat(66) +
      `\n  Products updated  : ${totalProductsUpdated}` +
      `\n  Images processed  : ${totalImagesProcessed}` +
      `\n  Failures          : ${failures.length}` +
      "\n" +
      "═".repeat(66) +
      "\n",
  );

  if (failures.length > 0) {
    console.log("\nFailures:\n");
    for (const f of failures) {
      console.log(`  - ${f.slug} / ${f.file}: ${f.error}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
