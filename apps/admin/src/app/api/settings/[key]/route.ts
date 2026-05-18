import { requireSession } from "@/lib/api/requireSession";
import { ok, badRequest, noContent, notFound } from "@store/shared";
import { connectDB, handleMongoError, Setting } from "@store/db";

import { recordActivity } from "@/lib/services/activityLog";
import { toSettingResponse, type SettingLean } from "@/lib/serializers/setting";

interface RouteContext {
  params: Promise<{ key: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { response } = await requireSession("settings_view");
  if (response) {
    return response;
  }

  const { key } = await params;
  if (!key || key.length === 0) {
    return badRequest("Key is required.");
  }

  await connectDB();
  const doc = await Setting.findOne({ key }).lean<SettingLean>();
  if (!doc) {
    return notFound("Setting not found");
  }

  return ok(toSettingResponse(doc));
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("settings_update");
  if (response) {
    return response;
  }

  const { key } = await params;
  if (!key || key.length === 0) {
    return badRequest("Key is required.");
  }

  await connectDB();
  try {
    const doc = await Setting.findOneAndDelete({ key }).lean<SettingLean>();
    if (!doc) {
      return notFound("Setting not found");
    }

    await recordActivity({
      actor,
      action: "deleted",
      resourceType: "settings",
      resourceId: key,
      resourceLabel: key,
    });
    return noContent();
  } catch (error) {
    return handleMongoError(error);
  }
}
