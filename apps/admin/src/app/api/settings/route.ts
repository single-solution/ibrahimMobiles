import { requireSession } from "@/lib/api/requireSession";
import {
  badRequest,
  FIELD_LIMITS,
  isValidationError,
  ok,
  parseBody,
  validateString,
} from "@store/shared";

import { connectDB, handleMongoError, invalidateStoreSettingsCache, Setting } from "@store/db";

import { recordActivity } from "@/lib/services/activityLog";

import { toSettingResponse, type SettingLean } from "@/lib/serializers/setting";
import type { AdminSetting } from "@/types/admin";

export async function GET(request: Request) {
  const { response } = await requireSession("settings_view");
  if (response) {
    return response;
  }

  await connectDB();
  const url = new URL(request.url);
  const group = url.searchParams.get("group");
  const filter: Record<string, unknown> = {};
  if (group) {
    filter.group = group;
  }

  const docs = await Setting.find(filter).sort({ group: 1, key: 1 }).lean<SettingLean[]>();

  const items: AdminSetting[] = docs.map(toSettingResponse);
  return ok({ items });
}

interface SettingUpsertInput {
  key?: unknown;
  value?: unknown;
  description?: unknown;
  group?: unknown;
}

export async function PUT(request: Request) {
  const { actor, response } = await requireSession("settings_update");
  if (response) {
    return response;
  }

  const body = await parseBody<SettingUpsertInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const keyResult = validateString(body.key, { label: "Key", max: FIELD_LIMITS.mediumText });
  if (isValidationError(keyResult)) {
    return badRequest(keyResult.error);
  }

  if (body.value === undefined) {
    return badRequest("Value is required.");
  }

  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, FIELD_LIMITS.settingDescription)
      : undefined;
  const group =
    typeof body.group === "string" && body.group.trim().length > 0
      ? body.group.trim().slice(0, FIELD_LIMITS.settingGroup)
      : undefined;

  await connectDB();
  try {
    const doc = await Setting.findOneAndUpdate(
      { key: keyResult },
      {
        $set: {
          key: keyResult,
          value: body.value,
          description,
          group,
          updatedBy: actor.id,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean<SettingLean>();

    invalidateStoreSettingsCache();
    await recordActivity({
      actor,
      action: "updated",
      resourceType: "settings",
      resourceId: keyResult,
      resourceLabel: keyResult,
    });
    return ok(toSettingResponse(doc));
  } catch (error) {
    return handleMongoError(error);
  }
}
