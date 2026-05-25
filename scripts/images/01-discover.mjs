#!/usr/bin/env node
/**
 * Phase 1: Discover candidate product images from manufacturer / Wikipedia pages
 * and download them to `tmp/product-images/<slug>/`.
 *
 * Then generate `tmp/product-images/preview.html` so the user can scan every
 * downloaded image in a browser before we run the upload phase.
 *
 * NOTHING is uploaded or written to MongoDB by this script. Pure local I/O.
 *
 * Run:
 *   node scripts/images/01-discover.mjs
 *
 * Re-runs are idempotent — already-downloaded files are skipped.
 */

import { mkdir, writeFile, access } from "node:fs/promises";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { SOURCES, TARGET_IMAGES_PER_PRODUCT } from "./sources.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const STAGING_DIR = resolve(REPO_ROOT, "tmp", "product-images");

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.6 Safari/605.1.15";

const MIN_BYTES = 8 * 1024; // 8 KB — anything smaller is likely an icon/sprite
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB hard ceiling per image
const FETCH_TIMEOUT_MS = 25_000;

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const TRACK_SUBSTRINGS_REJECT = [
  "sprite",
  "/icon",
  "favicon",
  "logo",
  "/svg",
  ".svg",
  "footer",
  "/ad/",
  "/ads/",
  "header",
  "google-tag",
  "facebook.svg",
  "twitter.svg",
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...init.headers,
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve a possibly relative/protocol-relative URL to absolute. */
function absolutizeUrl(maybeRelative, baseUrl) {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return null;
  }
}

/** Strip URL query/hash to guess the file extension. */
function getExtensionFromUrl(url) {
  try {
    const u = new URL(url);
    const ext = extname(u.pathname).toLowerCase();
    return ext || "";
  } catch {
    return "";
  }
}

/** Known CDN host patterns that host product images without a file extension. */
const EXTENSIONLESS_CDN_PATTERNS = [
  /store\.storeimages\.cdn-apple\.com\/.+\/is\//i, // Apple "scene7" CDN
  /images\.samsung\.com\/is\/image\/samsung/i, // Samsung scene7
  /stg-images\.samsung\.com\/is\/image\/samsung/i, // Samsung staging scene7
  /api\.samsungmobilepress\.com\/api\/v1\/file\//i, // Samsung Mobile Press archive (gold)
  /lh3\.googleusercontent\.com\//i, // Google Store / Pixel marketing
  /image\.oppo\.com\//i, // Oppo CDN
];

/** Globally blacklisted image URLs (low quality, generic banners, etc.). */
const GLOBAL_URL_BLACKLIST = [
  "uk-111-105186828",
  "/services-iphone-",
  "iphone-compare-",
  "watch-compare-",
  "/incentive_card/",
  "/feature_card/",
  "samsung-logo",
  "/og-default",
  // Samsung marketing banners / key visuals (not product shots)
  "-banner-",
  "_banner_",
  "/banner/",
  "try-galaxy",
  "-kv-",
  "kv-headline",
  "kv-galaxy",
  "features-kv",
  "fullbleed",
  "ifit-banner",
  "fresh7",
  "ft03-feature",
  "ft03-fullbleed",
  // Oppo header/nav thumbnails for OTHER products
  "/navigation/",
  "/new-navigation/",
  "/nav-",
  // Apple chrome
  "/og/watch_og",
  "watch_og_",
  "/02_value_props/",
  "/03_value_props/",
  "/04_value_props/",
  "/image_accordion/",
  // Apple shop chrome
  "/dc",
  "/dn",
  // Samsung global brand chrome (logos/icons)
  "etc.clientlibs/samsung/clientlibs/consumer/global/clientlib-common",
  "samsung-press-room",
  // Apple promo overlays
  "/services-",
  // Mobile-only banner variants and translation files
  "-mo-new",
  "imbypass=true",
  // Oppo site QR code on every nav
  "app-qr-code",
  // Generic site chrome icons
  "/jimu/",
];

/** Heuristic: skip obviously non-product images. */
function looksLikeProductImage(url) {
  const lower = url.toLowerCase();
  if (TRACK_SUBSTRINGS_REJECT.some((bad) => lower.includes(bad))) return false;
  if (GLOBAL_URL_BLACKLIST.some((bad) => lower.includes(bad.toLowerCase()))) return false;
  const ext = getExtensionFromUrl(url);
  if (ext) {
    return ALLOWED_EXTENSIONS.has(ext);
  }
  return EXTENSIONLESS_CDN_PATTERNS.some((re) => re.test(url));
}

/**
 * Per-slug keyword rejection: if the slug is for product X, reject URLs
 * referencing competing products in the same brand (e.g. "iphone-17" when
 * we're trying to find iPhone 16 images).
 */
const SLUG_REJECT_KEYWORDS = {
  "apple-iphone-16-pro-max": ["iphone-17", "iphone-air", "iphone-18", "iphone-15"],
  "apple-iphone-16-pro": ["iphone-17", "iphone-air", "iphone-18", "iphone-15", "iphone-16-pro-max"],
  "apple-iphone-16-plus": ["iphone-17", "iphone-air", "iphone-18", "iphone-15", "iphone-16-pro"],
  "apple-iphone-16": ["iphone-17", "iphone-air", "iphone-18", "iphone-15", "iphone-16-pro", "iphone-16-plus"],
  "samsung-galaxy-s25-ultra": ["s24", "s26", "z-fold", "z-flip", "galaxy-watch", "buds3", "s25-plus", "s25_"],
  "samsung-galaxy-s25-plus": ["s24", "s26", "z-fold", "z-flip", "galaxy-watch", "buds3", "s25-ultra"],
  "samsung-galaxy-s25": ["s24", "s26", "z-fold", "z-flip", "galaxy-watch", "buds3", "s25-ultra", "s25-plus"],
  "samsung-galaxy-z-fold-6": ["fold5", "fold7", "flip6", "flip5", "s25", "galaxy-watch", "buds"],
  "samsung-galaxy-z-flip-6": ["flip5", "flip7", "fold6", "fold5", "s25", "galaxy-watch", "buds"],
  "google-pixel-9-pro-xl": ["pixel-8", "pixel-10", "pixel-7", "pixel_9_pro_fold", "pixel-watch"],
  "google-pixel-9-pro": ["pixel-8", "pixel-10", "pixel-7", "pixel_9_pro_fold", "pixel-watch", "pixel-9-pro-xl"],
  "google-pixel-9": ["pixel-8", "pixel-10", "pixel-7", "pixel_9_pro", "pixel-watch"],
  "google-pixel-9-pro-fold": ["pixel-8", "pixel-10", "pixel-7", "pixel-watch"],
  "oppo-find-x8-pro": ["find-x7", "find-x9", "find-x8/", "reno", "pad", "enco", "wearable", "router", "watch", "buds", "earphones", "earbuds"],
  "oppo-find-x8": ["find-x7", "find-x9", "find-x8-pro", "reno", "pad", "enco", "wearable", "router", "watch", "buds", "earphones", "earbuds"],
  "oppo-reno-12-pro": ["find-", "reno-11", "reno-13", "pad", "enco", "wearable", "router", "watch", "buds", "earphones", "earbuds", "reno15", "reno-15", "reno-16", "reno16"],
  "apple-airpods-pro-2": ["airpods-max", "airpods-4", "airpods_3", "airpods-3", "airpods_pro_3", "airpods-pro-3", "homepod"],
  "apple-airpods-max": ["airpods-pro", "airpods-4", "airpods_3", "homepod"],
  "apple-watch-series-10-46mm-gps": ["watch-ultra", "watch_ultra", "watch-se", "watch_se", "series-9", "series-11", "series_9", "series_11"],
  "apple-watch-ultra-2-49mm": ["series-9", "series-10", "series-11", "series_9", "series_10", "series_11", "watch-se", "watch_se", "/watch_and_iphone"],
  "samsung-galaxy-watch-7-44mm": ["watch-ultra", "watch6", "watch8", "watch-5"],
  "samsung-galaxy-watch-ultra-46mm": ["watch7", "watch6", "watch8", "watch-5"],
  "samsung-galaxy-buds-3-pro": ["buds2", "buds-2", "buds-fe", "galaxy-watch", "smartphones"],
};

function passesSlugFilter(slug, url) {
  const blacklist = SLUG_REJECT_KEYWORDS[slug] || [];
  const lower = url.toLowerCase();
  return !blacklist.some((bad) => lower.includes(bad));
}

/** Wikipedia: rewrite `/thumb/.../<N>px-<file>` to `/thumb/.../1280px-<file>` for higher resolution. */
function upscaleWikipediaThumb(url) {
  if (!url.includes("upload.wikimedia.org/wikipedia/commons/thumb/")) return url;
  return url.replace(/\/(\d+)px-([^/]+)$/i, "/1280px-$2");
}

/** Extract candidate image URLs from an HTML page. */
function extractImageUrls(html, baseUrl) {
  const candidates = [];

  // og:image / twitter:image meta tags (always 1 hero)
  const metaRegex =
    /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]+content=["']([^"']+)["']/gi;
  for (const m of html.matchAll(metaRegex)) {
    const url = absolutizeUrl(m[1], baseUrl);
    if (url) candidates.push({ url, source: "meta", alt: "hero" });
  }
  // …also handle the reversed `content="..." property="og:image"` order
  const metaRevRegex =
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["']/gi;
  for (const m of html.matchAll(metaRevRegex)) {
    const url = absolutizeUrl(m[1], baseUrl);
    if (url) candidates.push({ url, source: "meta", alt: "hero" });
  }

  // <img src="…" alt="…">
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*?(?:alt=["']([^"']*)["'])?/gi;
  for (const m of html.matchAll(imgRegex)) {
    const url = absolutizeUrl(m[1], baseUrl);
    if (!url) continue;
    candidates.push({ url, source: "img", alt: m[2] || "" });
  }

  // srcset entries (Apple, Samsung often inline largest version here)
  const srcsetRegex = /(?:srcset|data-srcset)=["']([^"']+)["']/gi;
  for (const m of html.matchAll(srcsetRegex)) {
    const list = m[1]
      .split(",")
      .map((entry) => entry.trim().split(/\s+/)[0])
      .filter(Boolean);
    for (const raw of list) {
      const url = absolutizeUrl(raw, baseUrl);
      if (url) candidates.push({ url, source: "srcset", alt: "" });
    }
  }

  // data-src / lazy-loaded
  const dataSrcRegex = /data-(?:src|image|hires|lazy)=["']([^"']+)["']/gi;
  for (const m of html.matchAll(dataSrcRegex)) {
    const url = absolutizeUrl(m[1], baseUrl);
    if (url) candidates.push({ url, source: "data-src", alt: "" });
  }

  // Background images
  const bgRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
  for (const m of html.matchAll(bgRegex)) {
    const url = absolutizeUrl(m[1], baseUrl);
    if (url) candidates.push({ url, source: "bg-image", alt: "" });
  }

  // Inline JSON / Next.js RSC payloads — some sites (Samsung Mobile Press,
  // Google Store) embed product image URLs in `__next_f.push` JSON blobs
  // rather than rendering them as <img> elements server-side. Catch any
  // URL that lives inside the response body as a bare string.
  const inlineUrlRegex =
    /https?:\\?\/\\?\/[^"'\s<>\\]+?\.(?:jpg|jpeg|png|webp)(?:\\?\?[^"'\s<>\\]*)?/gi;
  for (const m of html.matchAll(inlineUrlRegex)) {
    const cleaned = m[0].replace(/\\\//g, "/");
    candidates.push({ url: cleaned, source: "inline-json", alt: "" });
  }

  // Extensionless CDN URLs in inline payloads (Samsung Mobile Press, Apple scene7, etc.)
  const extensionlessJsonRegex =
    /https?:\\?\/\\?\/(?:api\.samsungmobilepress\.com\/api\/v1\/file\/|store\.storeimages\.cdn-apple\.com\/[^"'\s<>\\]*\/is\/|images\.samsung\.com\/is\/image\/samsung\/|lh3\.googleusercontent\.com\/)[A-Za-z0-9\-_=/.+~,!]+/gi;
  for (const m of html.matchAll(extensionlessJsonRegex)) {
    const cleaned = m[0].replace(/\\\//g, "/");
    candidates.push({ url: cleaned, source: "inline-json", alt: "" });
  }

  return candidates;
}

/** Score a candidate URL — higher is better. */
function scoreCandidate(candidate, baseUrl) {
  const url = candidate.url.toLowerCase();
  let score = 0;

  if (candidate.source === "meta") score += 100;

  // Reward higher-resolution hints
  if (/(?:1080|1440|1920|2400|2880|3000|4000)/.test(url)) score += 40;
  if (/(?:large|hero|original|full|primary)/.test(url)) score += 25;
  if (/(?:product|device|phone)/.test(url)) score += 15;
  if (/wid=(?:940|1080|1200|1440|1600|1800|2000)/.test(url)) score += 30;

  // Penalize obvious thumbnails / sprites
  if (/(?:thumb|thumbnail|icon|swatch|tile|small)/.test(url)) score -= 30;
  if (/(?:48|56|64|72|96|120|128)x\1?/.test(url)) score -= 20;
  if (url.endsWith(".gif")) score -= 50;

  // Reward CC-licensed Wikimedia
  if (url.includes("upload.wikimedia.org")) score += 20;

  // Reward known good CDNs
  if (url.includes("store.storeimages.cdn-apple.com")) score += 35;
  if (url.includes("images.samsung.com")) score += 35;
  if (url.includes("image.oppo.com")) score += 35;
  if (url.includes("store.google.com")) score += 35;
  if (url.includes("lh3.googleusercontent.com")) score += 30;
  if (url.includes("api.samsungmobilepress.com")) score += 60; // best Samsung product photos
  if (url.includes("/gallery/")) score += 25; // Samsung product-detail gallery paths

  // Penalize fishy URLs
  if (url.includes("/lock-up") || url.includes("badge")) score -= 30;
  if (url.includes("press_room") || url.includes("emoji")) score -= 30;

  // Same host as the source page is usually good
  try {
    const sameHost = new URL(candidate.url).host === new URL(baseUrl).host;
    if (sameHost) score += 5;
  } catch {
    /* */
  }

  return score;
}

/** De-duplicate candidates by normalised URL (strip Apple/Samsung sizing params). */
function dedupeCandidates(candidates) {
  const seen = new Map();
  for (const c of candidates) {
    let key;
    try {
      const u = new URL(c.url);
      // Strip common sizing/resize params so 940-wide and 1800-wide variants
      // of the same image are deduped to the larger.
      const drop = ["wid", "hei", "w", "h", "size", "fmt", "qlt", "op"];
      for (const k of drop) u.searchParams.delete(k);
      key = `${u.origin}${u.pathname}`;
    } catch {
      key = c.url;
    }
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, c);
    } else {
      // keep highest scoring URL for this normalised key
      const score = scoreCandidate(c, c.url);
      const exScore = scoreCandidate(existing, existing.url);
      if (score > exScore) seen.set(key, c);
    }
  }
  return [...seen.values()];
}

/** Download an image. Returns { ok, size, path, contentType, error }. */
async function downloadImage(url, destPathBase) {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, url };
    }
    const contentType = res.headers.get("content-type") || "";
    if (!/^image\//i.test(contentType) && !ALLOWED_EXTENSIONS.has(getExtensionFromUrl(url))) {
      return { ok: false, error: `Not an image (${contentType})`, url };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_BYTES) {
      return { ok: false, error: `Too small (${buf.length}B)`, url };
    }
    if (buf.length > MAX_BYTES) {
      return { ok: false, error: `Too large (${buf.length}B)`, url };
    }
    // Decide extension from content-type
    let ext = ".jpg";
    if (contentType.includes("png")) ext = ".png";
    else if (contentType.includes("webp")) ext = ".webp";
    else if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = ".jpg";
    else {
      const urlExt = getExtensionFromUrl(url);
      if (ALLOWED_EXTENSIONS.has(urlExt)) ext = urlExt;
    }
    const finalPath = `${destPathBase}${ext}`;
    await mkdir(dirname(finalPath), { recursive: true });
    await writeFile(finalPath, buf);
    return { ok: true, size: buf.length, path: finalPath, contentType, url };
  } catch (error) {
    return { ok: false, error: error.message || String(error), url };
  }
}

async function processSlug(slug, candidatePages) {
  const slugDir = resolve(STAGING_DIR, slug);
  await mkdir(slugDir, { recursive: true });

  const results = [];
  const seenUrls = new Set();

  for (const candidate of candidatePages) {
    if (results.length >= TARGET_IMAGES_PER_PRODUCT) break;

    const { url: candidateUrl, source, direct } = candidate;

    // ─── Direct image URL (no page scraping) ───
    if (direct) {
      if (seenUrls.has(candidateUrl)) continue;
      seenUrls.add(candidateUrl);

      const idx = results.length + 1;
      const hash = createHash("md5").update(candidateUrl).digest("hex").slice(0, 6);
      const fileBase = resolve(slugDir, `${String(idx).padStart(2, "0")}-${hash}`);
      const result = await downloadImage(candidateUrl, fileBase);
      if (result.ok) {
        console.log(
          `    ✓ direct  ${(result.size / 1024).toFixed(0)} KB  ${candidateUrl.slice(0, 90)}${candidateUrl.length > 90 ? "…" : ""}`,
        );
        results.push({
          ...result,
          sourceUrl: candidateUrl,
          sourcePage: candidateUrl,
          sourceProvider: source,
          alt: "direct",
          score: 200,
        });
      } else {
        console.log(`    ✗ direct  ${result.error}  ${candidateUrl.slice(0, 90)}`);
      }
      continue;
    }

    // ─── Page-scrape path ───
    process.stdout.write(`  • fetching ${candidateUrl} … `);
    let html;
    try {
      const res = await fetchWithTimeout(candidateUrl);
      if (!res.ok) {
        console.log(`HTTP ${res.status} (skipped)`);
        continue;
      }
      html = await res.text();
      console.log(`${(html.length / 1024).toFixed(1)} KB`);
    } catch (error) {
      console.log(`FAILED (${error.message || error})`);
      continue;
    }

    const raw = extractImageUrls(html, candidateUrl);
    const filtered = raw
      .filter((c) => looksLikeProductImage(c.url))
      .filter((c) => passesSlugFilter(slug, c.url))
      .map((c) => ({ ...c, url: upscaleWikipediaThumb(c.url) }));
    const deduped = dedupeCandidates(filtered);
    const ranked = deduped
      .map((c) => ({ ...c, score: scoreCandidate(c, candidateUrl) }))
      .sort((a, b) => b.score - a.score);

    let downloadedFromThisPage = 0;
    for (const c of ranked) {
      if (results.length >= TARGET_IMAGES_PER_PRODUCT) break;
      if (downloadedFromThisPage >= 6) break;
      if (seenUrls.has(c.url)) continue;
      seenUrls.add(c.url);
      if (c.score < 5) continue;

      const idx = results.length + 1;
      const hash = createHash("md5").update(c.url).digest("hex").slice(0, 6);
      const fileBase = resolve(slugDir, `${String(idx).padStart(2, "0")}-${hash}`);
      const result = await downloadImage(c.url, fileBase);
      if (result.ok) {
        console.log(
          `    ✓ ${(result.size / 1024).toFixed(0)} KB  ${c.url.slice(0, 90)}${c.url.length > 90 ? "…" : ""}`,
        );
        results.push({
          ...result,
          sourceUrl: c.url,
          sourcePage: candidateUrl,
          sourceProvider: source,
          alt: c.alt,
          score: c.score,
        });
        downloadedFromThisPage += 1;
      }
    }
  }

  return results;
}

function buildPreviewHtml(report) {
  const totalProducts = Object.keys(report).length;
  const totalImages = Object.values(report).reduce((sum, r) => sum + r.images.length, 0);
  const missing = Object.entries(report).filter(([, r]) => r.images.length === 0);

  const productCards = Object.entries(report)
    .map(([slug, { images }]) => {
      const status =
        images.length === 0
          ? `<span style="color:#b91c1c;font-weight:600">NO IMAGES</span>`
          : images.length < 2
            ? `<span style="color:#b45309;font-weight:600">${images.length} image</span>`
            : `<span style="color:#15803d;font-weight:600">${images.length} images</span>`;

      const imgs = images
        .map(
          (img, i) => `
        <figure style="margin:0;display:flex;flex-direction:column;gap:6px;">
          <a href="file://${img.path}" target="_blank" rel="noopener">
            <img src="file://${img.path}" alt="${img.alt || slug}"
              style="width:180px;height:180px;object-fit:contain;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;" />
          </a>
          <figcaption style="font-size:11px;color:#475569;line-height:1.4;max-width:180px;word-break:break-all;">
            #${i + 1} · ${(img.size / 1024).toFixed(0)} KB<br>
            <a href="${img.sourceUrl}" target="_blank" rel="noopener" style="color:#0369a1;text-decoration:none;">source ↗</a>
          </figcaption>
        </figure>`,
        )
        .join("");

      return `
      <section style="margin-bottom:24px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;">
        <header style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;">
          <h3 style="margin:0;font-size:15px;color:#0f172a;">${slug}</h3>
          ${status}
        </header>
        <div style="display:flex;flex-wrap:wrap;gap:12px;">${imgs || "<em style=\"color:#94a3b8\">No images downloaded</em>"}</div>
      </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Product images · staging review</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
           background:#f8fafc; color:#0f172a; max-width:1280px; margin:0 auto; padding:24px; }
    h1 { margin:0 0 8px; }
    .summary { background:#fff; padding:16px; border:1px solid #e2e8f0; border-radius:12px;
               margin-bottom:24px; display:flex; gap:24px; flex-wrap:wrap; }
    .summary .stat { display:flex; flex-direction:column; }
    .summary .stat .num { font-size:24px; font-weight:600; }
    .summary .stat .label { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; }
    .missing { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:12px 16px;
               border-radius:12px; margin-bottom:24px; }
    .missing strong { display:block; margin-bottom:6px; }
    a { color:#0369a1; }
  </style>
</head>
<body>
  <h1>Product images · staging review</h1>
  <p style="color:#64748b;margin-top:0;">Downloaded to <code>tmp/product-images/</code>. Click any image to open at full size. Nothing has been uploaded yet.</p>

  <div class="summary">
    <div class="stat"><span class="num">${totalProducts}</span><span class="label">Products</span></div>
    <div class="stat"><span class="num">${totalImages}</span><span class="label">Images downloaded</span></div>
    <div class="stat"><span class="num">${missing.length}</span><span class="label">Products with NO images</span></div>
  </div>

  ${
    missing.length
      ? `<div class="missing">
        <strong>Missing image discovery for ${missing.length} product${missing.length === 1 ? "" : "s"}:</strong>
        ${missing.map(([slug]) => `<code>${slug}</code>`).join(", ")}
      </div>`
      : ""
  }

  ${productCards}
</body>
</html>`;
}

async function main() {
  await mkdir(STAGING_DIR, { recursive: true });

  const slugs = Object.keys(SOURCES);
  console.log(`\n► Discovering images for ${slugs.length} products`);
  console.log(`  Staging: ${STAGING_DIR}\n`);

  const report = {};
  for (const slug of slugs) {
    console.log(`\n▸ ${slug}`);
    const images = await processSlug(slug, SOURCES[slug]);
    report[slug] = { images };
    if (images.length === 0) console.log(`  ✗ NO IMAGES`);
  }

  // Persist machine-readable manifest for phase 2
  const manifestPath = resolve(STAGING_DIR, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(report, null, 2));
  console.log(`\n✓ Manifest written → ${manifestPath}`);

  const previewPath = resolve(STAGING_DIR, "preview.html");
  await writeFile(previewPath, buildPreviewHtml(report));
  console.log(`✓ Preview HTML written → ${previewPath}`);

  // Summary
  const totals = Object.values(report).reduce(
    (acc, r) => {
      acc.products += 1;
      acc.images += r.images.length;
      if (r.images.length === 0) acc.empty += 1;
      return acc;
    },
    { products: 0, images: 0, empty: 0 },
  );
  console.log(
    `\n══════════════════════════════════════════════════════════════════
 Summary
══════════════════════════════════════════════════════════════════
 Products processed : ${totals.products}
 Images downloaded  : ${totals.images}
 Products missing   : ${totals.empty}

 Open the preview in your browser to review:
   open ${previewPath}
══════════════════════════════════════════════════════════════════`,
  );
}

main().catch((err) => {
  console.error("\n✗ Discovery failed:", err);
  process.exitCode = 1;
});
