/**
 * Typed bulk read/write for the canonical `StoreSettings` shape (siteName,
 * support contacts, social links, policy thresholds). Sits alongside the
 * generic `/api/settings` endpoint — that one keeps stretching to anything
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
    updates.push({ field, value: coerced });
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
