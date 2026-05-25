/**
 * Typed bulk read/write for the canonical `StoreSettings` shape (siteName,
 * support contacts, social links, policy thresholds). Sits alongside the
 * key-value `/api/settings` endpoint — that one keeps stretching to anything
 * key-value, this one is what the admin UI actually drives.
 *
 * GET   → returns merged settings (DB overrides layered on factory defaults).
 * PUT   → accepts a partial `StoreSettings` body, validates each field
 *         against its expected runtime type, persists overrides, and
 *         invalidates the in-process cache so the next read is fresh.
 */
import { requireSession } from "@/lib/api/requireSession";
import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";
import {
  connectDB,
  getStoreSettings,
  handleMongoError,
  invalidateStoreSettingsCache,
  Setting,
} from "@store/db";
import {
  badRequest,
  coerceStoreSettingValue,
  groupForField,
  ok,
  parseBody,
  STORE_SETTING_DEFAULTS,
  STORE_SETTING_KEYS,
  toStoreSettingKey,
  type StoreSettings,
} from "@store/shared";

export async function GET() {
  const { response } = await requireSession("settings_view");
  if (response) {
    return response;
  }

  const settings = await getStoreSettings();
  return ok({ settings });
}

type PutBody = Partial<Record<keyof StoreSettings, unknown>>;

export async function PUT(request: Request) {
  const { actor, response } = await requireSession("settings_update");
  if (response) {
    return response;
  }

  const body = await parseBody<PutBody>(request);
  if (body instanceof Response) {
    return body;
  }

  const updates: Array<{ field: keyof StoreSettings; value: StoreSettings[keyof StoreSettings] }> =
    [];
  for (const field of STORE_SETTING_KEYS) {
    if (!(field in body)) {
      continue;
    }
    const raw = body[field];
    const coerced = coerceStoreSettingValue(field, raw);
    if (coerced === null) {
      const expectedType = typeof STORE_SETTING_DEFAULTS[field];
      return badRequest(`"${field}" must be a ${expectedType}.`);
    }
    // Hero gallery limits — keep within a sane window so a typo can't crash
    // the homepage with a 10 000-product aggregation or starve it with 0.
    let value: StoreSettings[keyof StoreSettings] = coerced;
    if (field === "homeHeroLimit") {
      const numeric = typeof coerced === "number" ? coerced : Number(coerced);
      if (!Number.isFinite(numeric) || numeric < 4 || numeric > 24) {
        return badRequest("Hero gallery size must be between 4 and 24.");
      }
      value = Math.round(numeric) as StoreSettings[keyof StoreSettings];
    }
    if (field === "storefrontUrl") {
      const trimmed = typeof coerced === "string" ? coerced.trim() : "";
      if (trimmed.length > 0) {
        try {
          const url = new URL(trimmed);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            return badRequest("Storefront URL must start with http:// or https://.");
          }
        } catch {
          return badRequest("Storefront URL must be a valid URL (e.g. https://example.com).");
        }
      }
      value = trimmed.replace(/\/$/, "") as StoreSettings[keyof StoreSettings];
    }
    if (field === "lowStockThreshold") {
      const numeric = typeof coerced === "number" ? coerced : Number(coerced);
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1_000) {
        return badRequest("Low-stock threshold must be between 0 and 1000.");
      }
      value = Math.floor(numeric) as StoreSettings[keyof StoreSettings];
    }
    if (field === "metaPixelId") {
      const trimmed = typeof coerced === "string" ? coerced.trim() : "";
      if (trimmed.length > 0 && !/^\d{6,20}$/.test(trimmed)) {
        return badRequest(
          "Meta Pixel ID must be 6–20 digits (no letters or dashes).",
        );
      }
      value = trimmed as StoreSettings[keyof StoreSettings];
    }
    if (field === "googleAnalyticsId") {
      const trimmed =
        typeof coerced === "string" ? coerced.trim().toUpperCase() : "";
      if (trimmed.length > 0 && !/^G-[A-Z0-9]{4,20}$/.test(trimmed)) {
        return badRequest(
          'Google Analytics ID must look like "G-XXXXXXXXXX".',
        );
      }
      value = trimmed as StoreSettings[keyof StoreSettings];
    }
    if (field === "googleTagManagerId") {
      const trimmed =
        typeof coerced === "string" ? coerced.trim().toUpperCase() : "";
      if (trimmed.length > 0 && !/^GTM-[A-Z0-9]{4,12}$/.test(trimmed)) {
        return badRequest(
          'Google Tag Manager ID must look like "GTM-XXXXXX".',
        );
      }
      value = trimmed as StoreSettings[keyof StoreSettings];
    }
    if (field === "tiktokPixelId") {
      const trimmed =
        typeof coerced === "string" ? coerced.trim().toUpperCase() : "";
      if (trimmed.length > 0 && !/^[A-Z0-9]{16,40}$/.test(trimmed)) {
        return badRequest(
          "TikTok Pixel ID must be 16–40 alphanumeric characters.",
        );
      }
      value = trimmed as StoreSettings[keyof StoreSettings];
    }
    updates.push({ field, value });
  }

  if (updates.length === 0) {
    return badRequest("No recognised settings fields supplied.");
  }

  await connectDB();
  try {
    await Promise.all(
      updates.map(({ field, value }) =>
        Setting.findOneAndUpdate(
          { key: toStoreSettingKey(field) },
          {
            $set: {
              key: toStoreSettingKey(field),
              value,
              group: groupForField(field),
              updatedBy: actor.id,
            },
          },
          { upsert: true, runValidators: true, setDefaultsOnInsert: true },
        ),
      ),
    );

    invalidateStoreSettingsCache();
    // Store settings drive the storefront chrome (site name, header
    // copy, social links, contact info) and the admin chrome's brand
    // strip. Bust both caches so the next page render reads the new
    // values instead of stale ones.
    bustAdminCaches();

    await recordActivity({
      actor,
      action: "updated",
      resourceType: "settings",
      resourceId: "store",
      resourceLabel: "Store settings",
      detail: updates.map(({ field }) => field).join(", "),
    });

    const settings = await getStoreSettings();
    return ok({ settings });
  } catch (error) {
    return handleMongoError(error);
  }
}
